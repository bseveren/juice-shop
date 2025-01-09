from importlib.metadata import packages_distributions
from pathlib import Path

import tomli

def _get_package_name(module: ModuleType) -> str:
    """
    Get package names from top level module names.
    Parameters
    ----------
    module : ModuleType
        The module name to get package names from.
    Returns
    -------
    str
        The package name.
    Notes
    -----
    packages_distributions returns a map between the top-level module names and package names.
    However, it doesn't understand packages installed in editable mode,
    which are handled in get_package_name.
    """
    _package_names_mapping = packages_distributions()
    if module.__name__ in _package_names_mapping:
        return _package_names_mapping[module.__name__][0]
    # The package is in editable mode: look in pyproject.toml to get the package name.
    with open(
        Path.joinpath(Path(module.__path__[0]).parent, "pyproject.toml"), "rb"
    ) as file:
        config = tomli.load(file)
        return config["tool"]["poetry"]["name"]
