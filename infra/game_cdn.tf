# A second CloudFront distribution, in front of the EC2 game server.
#
# Why this exists: the client is served over HTTPS (CloudFront always is), and
# browsers refuse to open a plaintext ws:// socket from an https:// page. So
# the WebSocket has to be wss://, which needs a TLS certificate — and a
# certificate needs a domain name, which this project deliberately doesn't
# have (it's a shared link for friends, per ARCHITECTURE.md).
#
# CloudFront solves both at once: it terminates TLS using its own
# *.cloudfront.net certificate, natively proxies WebSockets, and talks to the
# instance over plain HTTP inside AWS. That also means the instance never has
# to expose a port to the open internet (see the security group).
#
# The trade-off is an extra network hop on every message. For a life-sim
# ticking at 20Hz that's immaterial; for a twitch shooter it wouldn't be.

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}

resource "aws_cloudfront_distribution" "game" {
  enabled     = true
  comment     = "${var.project} game server (WebSocket)"
  price_class = "PriceClass_100"

  origin {
    domain_name = aws_eip.game.public_dns
    origin_id   = "game-ec2"

    custom_origin_config {
      http_port                = var.game_port
      https_port               = 443
      origin_protocol_policy   = "http-only" # TLS ends at CloudFront
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 60
      origin_keepalive_timeout = 60
    }
  }

  default_cache_behavior {
    target_origin_id       = "game-ec2"
    viewer_protocol_policy = "https-only"

    # Colyseus matchmaking is HTTP POST and the game itself is a WebSocket
    # upgrade, so every method has to pass through untouched.
    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD"]

    # Caching anything here would break both matchmaking and the socket.
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
    compress                 = false
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
