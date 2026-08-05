# A minimal public VPC rather than the account's default one, so the whole
# stack is reproducible from scratch in any account or region.

resource "aws_vpc" "main" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.project}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project}-igw" }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.20.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = { Name = "${var.project}-public" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.project}-public" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# CloudFront publishes the IP ranges its origin-fetch servers use. Locking
# ingress to that list means the game server can't be reached directly on its
# public IP — all traffic has to arrive through CloudFront, which is also
# what terminates TLS for us.
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "game" {
  name        = "${var.project}-game"
  description = "Game server: CloudFront origin traffic in, everything out"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Colyseus HTTP + WebSocket, from CloudFront only"
    from_port       = var.game_port
    to_port         = var.game_port
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  # No SSH rule on purpose. Shell access goes through SSM Session Manager,
  # which works over the instance's outbound HTTPS — nothing to expose.
  egress {
    description = "All outbound (ECR pulls, SSM, package installs)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-game" }
}
