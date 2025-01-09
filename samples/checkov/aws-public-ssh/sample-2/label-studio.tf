data "aws_ami" "ubuntu22" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "label_studio" {
  ami           = data.aws_ami.ubuntu22.id
  instance_type = "t3.micro"

  iam_instance_profile = aws_iam_role.label_studio.name
  key_name             = "label-studio"

  vpc_security_group_ids = [aws_security_group.label_studio.id]
  subnet_id              = module.vpc.public_subnets[0]

  root_block_device {
    volume_size = 20
  }
}

resource "aws_iam_role" "label_studio" {
  name               = "label-studio"
  assume_role_policy = file("../resources/trust/ec2.json")

  tags = { "Type" : "IAM Role", "Class" : "Label Studio" }
}

resource "aws_iam_role_policy" "label_studio_s3" {
  name = "S3Policy"
  role = aws_iam_role.label_studio.id

  policy = jsonencode(templatefile("../resources/policies/custom/label-studio.json.tftpl", { ds_bucket = aws_s3_bucket.data_science.arn }))
}

resource "aws_security_group" "label_studio" {
  vpc_id = module.vpc.vpc_id
  name   = "label-studio-sg"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group_rule" "label_studio_ssh" {
  security_group_id = aws_security_group.label_studio.id
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}
