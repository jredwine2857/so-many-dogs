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

# GitHub's OIDC subject claim now includes immutable numeric IDs alongside
# the names. Find them with:
#   gh api user --jq .id
#   gh api repos/OWNER/REPO --jq .id
# Leave as "*" to match any ID, which is less precise but still scoped to
# this owner/repo name.
variable "github_owner_id" {
  description = "Numeric GitHub user/org ID, or * to accept any."
  type        = string
  default     = "34180339"
}

variable "github_repository_id" {
  description = "Numeric GitHub repository ID, or * to accept any."
  type        = string
  default     = "1323517686"
}
