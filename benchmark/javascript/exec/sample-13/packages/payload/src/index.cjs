const { program } = require("commander");
const { CreateTemplates } = require("./command/create-templates");
const { RegistryLogin } = require("./command/registry-login");

program
    .command("registry-login")
    .description("Log in to the registry.")
    .requiredOption(
        "-u, --username <username>",
        "User to login to the registry."
    )
    .requiredOption(
        "-t, --token <token>",
        "User token to login to the registry."
    )
    .requiredOption(
        "-r, --registry <ci-registry>",
        "Registry where docker images are stored."
    )
    .action(RegistryLogin);

program
    .command("create-templates")
    .description("Get the templates for each product and merge them.")
    .requiredOption(
        "-N, --module-name <project-shortname...>",
        "Pass multiple times -p to process multiple projects."
    )
    .requiredOption(
        "--mg-rate <sample-rate>",
        "Percentage of the times that it should serve Mediaguard. [Defaults: 1]",
        1
    )
    .action(CreateTemplates);
