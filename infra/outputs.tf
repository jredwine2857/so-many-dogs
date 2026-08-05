output "play_url" {
  description = "Share this with friends — this is the game."
  value       = "https://${aws_cloudfront_distribution.client.domain_name}"
}

output "game_server_url" {
  description = "Baked into the client at build time as VITE_SERVER_URL."
  value       = "wss://${aws_cloudfront_distribution.game.domain_name}"
}

output "client_bucket" {
  description = "Where the deploy pipeline syncs the built client."
  value       = aws_s3_bucket.client.id
}

output "client_distribution_id" {
  description = "Invalidated after each client deploy."
  value       = aws_cloudfront_distribution.client.id
}

output "ecr_repository_url" {
  description = "Where the server container image is pushed."
  value       = aws_ecr_repository.server.repository_url
}

output "instance_id" {
  description = "Target for SSM deploy commands."
  value       = aws_instance.game.id
}

output "instance_public_ip" {
  description = "Direct address — reachable only from CloudFront by design."
  value       = aws_eip.game.public_ip
}
