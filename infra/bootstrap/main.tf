# One-time bootstrap, applied locally by a human with admin credentials.
#
# This exists because of a chicken-and-egg problem: the CI pipeline needs an
# S3 bucket to hold OpenTofu state and an IAM role it can assume, but it
# can't create those itself without already having them. So this small config
# runs once, by hand, with LOCAL state (there's no remote backend yet — it's
# creating it). Everything else lives in ../ and runs through CI.
#
#   cd infra/bootstrap
#   tofu init
#   tofu apply
#
# Keep terraform.tfstate here — it's gitignored. If you lose it, the
# resources still exist; you'd just need to import them to manage them again.

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

resource "random_id" "suffix" {
  byte_length = 4
}

# --- OpenTofu state -----------------------------------------------------

resource "aws_s3_bucket" "state" {
  bucket = "${var.project}-tfstate-${random_id.suffix.hex}"

  # State is the source of truth for the whole stack. Losing it means
  # orphaning live infrastructure, so make it hard to delete by accident.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --- GitHub Actions OIDC ------------------------------------------------

# Lets GitHub Actions assume an AWS role using a short-lived signed token
# instead of long-lived access keys stored as repo secrets. Nothing to leak,
# nothing to rotate.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]
}

data "aws_iam_policy_document" "ci_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Scoped to this repository only — any other repo presenting a valid
    # GitHub token still can't assume this role.
    #
    # Two patterns, because GitHub changed the subject format. It now embeds
    # immutable numeric IDs:
    #
    #   repo:owner@34180339/repo@1323517686:ref:refs/heads/main
    #
    # rather than the classic `repo:owner/repo:ref:...`. Pinning those IDs is
    # the stronger option — GitHub usernames can be released and re-registered
    # by someone else, but the numeric IDs are never reused. The name-only
    # pattern is kept as a fallback in case a given context still emits the
    # old format.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_owner}/${var.github_repo}:*",
        "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repo}@${var.github_repository_id}:*",
      ]
    }
  }
}

resource "aws_iam_role" "ci" {
  name               = "${var.project}-ci"
  assume_role_policy = data.aws_iam_policy_document.ci_assume.json
}

# Deliberately broad: this role has to create and later modify VPC, EC2,
# CloudFront, S3, ECR and the instance's own IAM role, so a tight policy
# would be a long list that breaks every time the stack grows. It is scoped
# to one account and one repo. If this ever becomes more than a hobby
# project, split plan (read-only) from apply and narrow these actions.
data "aws_iam_policy_document" "ci" {
  statement {
    effect = "Allow"
    actions = [
      "ec2:*",
      "cloudfront:*",
      "ecr:*",
      "ssm:SendCommand",
      "ssm:GetCommandInvocation",
      "ssm:DescribeInstanceInformation",
      # Reads Amazon's public AMI-id parameters, which is how the instance
      # pins its image (see compute.tf).
      "ssm:GetParameter",
      "ssm:GetParameters",
      "logs:*",
      "s3:*",
    ]
    resources = ["*"]
  }

  # IAM is the dangerous one, so keep it to roles this project owns.
  statement {
    effect = "Allow"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:GetRole",
      "iam:PassRole",
      "iam:TagRole",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:GetRolePolicy",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
      "iam:CreateInstanceProfile",
      "iam:DeleteInstanceProfile",
      "iam:GetInstanceProfile",
      "iam:AddRoleToInstanceProfile",
      "iam:RemoveRoleFromInstanceProfile",
      "iam:TagInstanceProfile",
    ]
    resources = [
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project}-*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:instance-profile/${var.project}-*",
    ]
  }
}

resource "aws_iam_role_policy" "ci" {
  name   = "${var.project}-ci"
  role   = aws_iam_role.ci.id
  policy = data.aws_iam_policy_document.ci.json
}
