# Feed these into the GitHub repo as Actions *variables* (not secrets — none
# of them are sensitive, and the role is useless without a token from this
# specific repo).

output "state_bucket" {
  description = "Set as repo variable TF_STATE_BUCKET."
  value       = aws_s3_bucket.state.id
}

output "ci_role_arn" {
  description = "Set as repo variable AWS_ROLE_ARN."
  value       = aws_iam_role.ci.arn
}

output "region" {
  description = "Set as repo variable AWS_REGION."
  value       = var.region
}

output "next_steps" {
  value = <<-EOT

    Bootstrap done. Now set these on the GitHub repo
    (Settings -> Secrets and variables -> Actions -> Variables):

      TF_STATE_BUCKET = ${aws_s3_bucket.state.id}
      AWS_ROLE_ARN    = ${aws_iam_role.ci.arn}
      AWS_REGION      = ${var.region}

    Then create an Environment named "production" with yourself as a
    required reviewer, so infra applies pause for approval.
  EOT
}
