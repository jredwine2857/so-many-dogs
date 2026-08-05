variable "project" {
  description = "Name prefix for every resource this project creates."
  type        = string
  default     = "so-many-dogs"
}

variable "region" {
  description = "AWS region. Ohio is the closest cheap region to Kentucky."
  type        = string
  default     = "us-east-2"
}

variable "github_owner" {
  description = "GitHub user or org that owns the repo (e.g. jredwine2857)."
  type        = string
}

variable "github_repo" {
  description = "Repository name, without the owner prefix."
  type        = string
  default     = "so-many-dogs"
}
