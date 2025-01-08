from yaml import Loader

class CustomLoader(Loader):
    def construct_yaml_str(self, node):
        return self.construct_scalar(node)

CustomLoader.add_constructor('tag:yaml.org,2002:str', CustomLoader.construct_yaml_str)
