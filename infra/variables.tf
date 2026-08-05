variable "project" {
  description = "Name prefix for every resource."
  type        = string
  default     = "so-many-dogs"
}

variable "region" {
  type    = string
  default = "us-east-2"
}

variable "instance_type" {
  description = <<-EOT
    t3.micro is free-tier eligible for the first 12 months on a new account
    and is plenty for a 14-player life-sim ticking at 20Hz. Bump to t3.small
    if the server ever starts falling behind.
  EOT
  type        = string
  default     = "t3.micro"
}

variable "game_port" {
  description = "Port the Colyseus server listens on inside the instance."
  type        = number
  default     = 2567
}
