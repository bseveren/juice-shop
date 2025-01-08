# CONFIG

locals {
  local_prefix = format("%s-p22", var.env)

  local_tags = {
    tester = "p22"
  }

  acme_ips = {
    "91.201.153.118/32" = "ip1"
    "91.201.155.3/32"   = "ip2"
    "3.124.32.241/32"   = "ip3"
    "34.254.82.208/32"  = "ip4"
  }

  acme_ports = {
    "Acme SSH" = {
      from     = 22
      to       = 22
      protocol = "tcp"
    },
    "Acme Monitoring" = {
      from     = 5666
      to       = 5666
      protocol = "tcp"
    },
    "Acme SSH Backup" = {
      from     = 39568
      to       = 39568
      protocol = "tcp"
    },
  }

  beento_ssh_ips = {
    "13.252.18.8/32"     = "jsmith"
    "101.204.83.101/32"  = "mroberts"
    "203.0.113.10/32"    = "asanders"
    "52.5.123.7/32"      = "lgarcia"
    "48.175.37.99/32"    = "djohnson"
    "23.45.67.89/32"     = "kwright"
    "8.34.213.213/32"    = "tmartin"
    "45.33.32.156/32"    = "pthompson"
    "209.85.202.91/32"   = "srivera"
    "151.101.65.140/32"  = "chughes"
    "69.63.176.13/32"    = "odixon"
    "93.184.216.34/32"   = "hblack"
    "104.16.123.96/32"   = "wcarter"
    "50.116.0.1/32"      = "rgomez"
    "34.235.84.42/32"    = "codeship"
    "34.238.108.61/32"   = "codeship"
    "34.239.17.55/32"    = "codeship"
    "35.153.154.87/32"   = "codeship"
    "35.170.141.30/32"   = "codeship"
    "203.112.104.132/29" = "AzDO Agent IP pool"
  }

  ingress_from_vpc = {
    rule        = "all-all"
    cidr_blocks = join(",", [aws_vpc.main.cidr_block])
    description = "VPC"
  }

  egress_to_vpc = {
    rule        = "all-all"
    cidr_blocks = join(",", [aws_vpc.main.cidr_block])
    description = "VPC"
  }

  internal_icmp = [
    {
      rule        = "all-icmp"
      cidr_blocks = join(",", [aws_vpc.main.cidr_block])
      description = "Internal ICMP"
    }
  ]

  external_icmp = [
    {
      from_port   = 8
      to_port     = 0
      protocol    = "icmp"
      cidr_blocks = "0.0.0.0/0"
      description = "Echo Request"
    },
    {
      from_port   = 3
      to_port     = 4
      protocol    = "icmp"
      cidr_blocks = "0.0.0.0/0"
      description = "Fragmentation Needed"
    },
    {
      from_port   = 11
      to_port     = 0
      protocol    = "icmp"
      cidr_blocks = "0.0.0.0/0"
      description = "Time Exceeded"
    },
  ]
}

# PREFIX LISTS - ACME

resource "aws_ec2_managed_prefix_list" "acme" {
  name           = "Acme"
  address_family = "IPv4"
  max_entries    = length(local.acme_ips)

  tags = local.local_tags
}

resource "aws_ec2_managed_prefix_list_entry" "acme" {
  for_each = local.acme_ips

  cidr           = each.key
  description    = each.value
  prefix_list_id = aws_ec2_managed_prefix_list.acme.id
}

# PREFIX LISTS - BEENTO

resource "aws_ec2_managed_prefix_list" "beento" {
  name           = "Beento"
  address_family = "IPv4"
  max_entries    = length(local.beento_ssh_ips)

  tags = local.local_tags
}

resource "aws_ec2_managed_prefix_list_entry" "beento" {
  for_each = local.beento_ssh_ips

  cidr           = each.key
  description    = each.value
  prefix_list_id = aws_ec2_managed_prefix_list.beento.id
}

# ALB

module "sg_alb" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.2"

  name        = format("%s-%s", local.local_prefix, "ALB")
  description = "ALB"
  vpc_id      = aws_vpc.main.id

  ingress_rules       = ["http-80-tcp", "https-443-tcp"]
  ingress_cidr_blocks = ["0.0.0.0/0"]

  ingress_with_cidr_blocks = local.external_icmp

  egress_rules = ["all-all"]

  tags = local.local_tags
}

# ECS

module "sg_ecs" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.2"

  name        = format("%s-%s", local.local_prefix, "ECS")
  description = "ECS"
  vpc_id      = aws_vpc.main.id

  number_of_computed_ingress_with_source_security_group_id = 2
  computed_ingress_with_source_security_group_id = [
    {
      rule                     = "http-80-tcp"
      source_security_group_id = module.sg_alb.security_group_id
      description              = "From ALB"
    },
    {
      rule                     = "http-80-tcp"
      source_security_group_id = module.sg_mgmt.security_group_id
      description              = "From MGMT"
    },
  ]

  ingress_with_cidr_blocks = local.internal_icmp

  ingress_with_self = [
    {
      rule        = "all-all"
      description = "From Self"
    }
  ]

  egress_rules       = ["all-all"]
  egress_cidr_blocks = ["0.0.0.0/0"]

  tags = local.local_tags
}

# RDS

module "sg_rds" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.2"

  name        = format("%s-%s", local.local_prefix, "RDS")
  description = "RDS"
  vpc_id      = aws_vpc.main.id

  number_of_computed_ingress_with_source_security_group_id = 4
  computed_ingress_with_source_security_group_id = [
    {
      rule                     = "mysql-tcp"
      source_security_group_id = module.sg_ecs.security_group_id
      description              = "From ECS"
    },
    {
      rule                     = "mysql-tcp"
      source_security_group_id = module.sg_mgmt.security_group_id
      description              = "From MGMT"
    },
    {
      rule                     = "postgresql-tcp"
      source_security_group_id = module.sg_ecs.security_group_id
      description              = "From ECS"
    },
    {
      rule                     = "postgresql-tcp"
      source_security_group_id = module.sg_mgmt.security_group_id
      description              = "From MGMT"
    },
  ]

  ingress_with_cidr_blocks = local.internal_icmp

  ingress_with_self = [
    {
      rule        = "all-all"
      description = "From Self"
    }
  ]

  egress_with_cidr_blocks = [local.egress_to_vpc]

  tags = local.local_tags
}

# TELEBIT

module "sg_telebit" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.2"

  name        = format("%s-%s", local.local_prefix, "TELEBIT")
  description = "TELEBIT"
  vpc_id      = aws_vpc.main.id

  ingress_with_cidr_blocks = concat(
    [
      {
        rule        = "http-80-tcp"
        description = "HTTP"
        cidr_blocks = "0.0.0.0/0"
      },
      {
        rule        = "https-443-tcp"
        description = "HTTPS"
        cidr_blocks = "0.0.0.0/0"
      },
    ],
    local.internal_icmp,
    local.external_icmp,
  )

  number_of_computed_ingress_with_source_security_group_id = 1
  computed_ingress_with_source_security_group_id = [
    {
      from_port                = 3010
      to_port                  = 3010
      protocol                 = "tcp"
      description              = "From ALB"
      source_security_group_id = module.sg_alb.security_group_id
    },
  ]

  egress_rules       = ["all-all"]
  egress_cidr_blocks = ["0.0.0.0/0"]

  tags = local.local_tags
}

# TELEBIT - Workaround (cannot create different prefix_list_id per rule)
#   https://github.com/terraform-aws-modules/terraform-aws-security-group/issues/281
#   https://github.com/terraform-aws-modules/terraform-aws-security-group/issues/312
#   https://github.com/terraform-aws-modules/terraform-aws-security-group/pull/318
#   etc.

resource "aws_vpc_security_group_ingress_rule" "telebit_prefix_acme" {
  for_each = local.acme_ports

  description       = each.key
  from_port         = each.value.from
  to_port           = each.value.to
  ip_protocol       = each.value.protocol
  security_group_id = module.sg_telebit.security_group_id
  prefix_list_id    = aws_ec2_managed_prefix_list.acme.id

  tags = local.local_tags
}

resource "aws_vpc_security_group_ingress_rule" "telebit_prefix_beento_ssh" {
  description       = "From Beento"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
  security_group_id = module.sg_telebit.security_group_id
  prefix_list_id    = aws_ec2_managed_prefix_list.beento.id

  tags = local.local_tags
}

# MGMT

module "sg_mgmt" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.2"

  name        = format("%s-%s", local.local_prefix, "MGMT")
  description = "MGMT"
  vpc_id      = aws_vpc.main.id

  ingress_with_cidr_blocks = local.internal_icmp

  egress_rules       = ["all-all"]
  egress_cidr_blocks = ["0.0.0.0/0"]

  tags = local.local_tags
}

# todo: mgmt icmp

# MGMT - Workaround (cannot create different prefix_list_id per rule)
#   https://github.com/terraform-aws-modules/terraform-aws-security-group/issues/281
#   https://github.com/terraform-aws-modules/terraform-aws-security-group/issues/312
#   https://github.com/terraform-aws-modules/terraform-aws-security-group/pull/318
#   etc.

resource "aws_vpc_security_group_ingress_rule" "mgmt_prefix_acme" {
  for_each = local.acme_ports

  description       = each.key
  from_port         = each.value.from
  to_port           = each.value.to
  ip_protocol       = each.value.protocol
  security_group_id = module.sg_mgmt.security_group_id
  prefix_list_id    = aws_ec2_managed_prefix_list.acme.id

  tags = local.local_tags
}

resource "aws_vpc_security_group_ingress_rule" "mgmt_prefix_beento_ssh" {
  description       = "From Beento"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
  security_group_id = module.sg_mgmt.security_group_id
  prefix_list_id    = aws_ec2_managed_prefix_list.beento.id

  tags = local.local_tags
}

# DEFAULT SG

resource "aws_default_security_group" "this" {
  vpc_id = aws_vpc.main.id

  ingress {
    protocol  = -1
    self      = true
    from_port = 0
    to_port   = 0
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
