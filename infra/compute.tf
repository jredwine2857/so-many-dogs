resource "aws_ecr_repository" "server" {
  name                 = "${var.project}-server"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Keep only the last handful of images so the repo doesn't grow forever.
resource "aws_ecr_lifecycle_policy" "server" {
  repository = aws_ecr_repository.server.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the 10 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# --- Instance role -------------------------------------------------------

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "instance" {
  name               = "${var.project}-instance"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

# Lets the deploy pipeline drive this box through SSM instead of SSH.
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "instance" {
  name = "${var.project}-instance"
  role = aws_iam_role.instance.name
}

# --- Instance ------------------------------------------------------------

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# The deploy script lives on the instance rather than in the SSM command, so
# the pipeline only has to pass an image tag. Changing it replaces the
# instance (user_data is only read at first boot), which is fine — the game
# holds no persistent state between sessions.
locals {
  user_data = <<-EOF
    #!/bin/bash
    set -euxo pipefail
    dnf update -y
    dnf install -y docker
    systemctl enable --now docker

    cat > /usr/local/bin/deploy-game.sh <<'SCRIPT'
    #!/bin/bash
    set -euo pipefail
    IMAGE="$1"
    REGISTRY="$(echo "$IMAGE" | cut -d/ -f1)"
    aws ecr get-login-password --region ${var.region} \
      | docker login --username AWS --password-stdin "$REGISTRY"
    docker pull "$IMAGE"
    docker rm -f so-many-dogs 2>/dev/null || true
    docker run -d --name so-many-dogs --restart unless-stopped \
      -p ${var.game_port}:${var.game_port} \
      -e PORT=${var.game_port} \
      "$IMAGE"
    docker image prune -f
    SCRIPT
    chmod +x /usr/local/bin/deploy-game.sh
  EOF
}

resource "aws_instance" "game" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.game.id]
  iam_instance_profile   = aws_iam_instance_profile.instance.name
  user_data              = local.user_data

  metadata_options {
    http_tokens   = "required" # IMDSv2 only
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = { Name = "${var.project}-game" }
}

# A stable address across stop/start, so the CloudFront origin doesn't have
# to be rewired every time the instance reboots.
resource "aws_eip" "game" {
  instance = aws_instance.game.id
  domain   = "vpc"
  tags     = { Name = "${var.project}-game" }
}
