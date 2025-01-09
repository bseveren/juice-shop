import fetch from 'node-fetch';
import fs from 'fs';
import { execSync } from 'child_process';

interface ResourceType {
  Name: string;
  Id: string;
}

const downloadResourceTypes = async (URL: string): Promise<ResourceType[]> => {
  const result = await fetch(URL);
  if (!result.ok) {
    const message = `${result.status} - ${result.statusText}`;
    throw new Error(message);
  }

  const data = await result.json() as ResourceType[];
  return data;
};

const generateClassProperty = (resourceType: ResourceType): string => {
  const toCamelCase = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);
  const propertyName = toCamelCase(resourceType.Name);
  return `static const ${propertyName} = '${resourceType.Id}';`;
};

const generateClass = (resourceTypes: ResourceType[]): string => {
  const properties = resourceTypes.map(generateClassProperty);
  return [
    '/// Warning: generated file, do not modify.',
    '/// A complete map of all resource types and their unique identifiers.',
    'class ResourceType {',
    'const ResourceType._();',
    ...properties,
    '}'
  ].join('\n');
};

const createFileFromContent = async (content: string): Promise<string> => {
  const filePath = '../lib/resource_type.dart'
  return new Promise((resolve, _) => {
    fs.writeFile(filePath, content, () => resolve(filePath));
  });
};

const formatDartFile = (filepath: string) => execSync(`dart format --line-length=120 ${filepath}`);

const urlFromArgsOrDefault = (url: string | null): string => {
  if (url) return url;
  
  const defaultUrl = 'https://api.acme.com/permissions/definitions';
  console.log(`⚠️  API endpoint not specified, defaulting to: ${defaultUrl}`);
  return defaultUrl;
}

const main = async (urlFromArgs: string | null) => {
  try {
    console.log('⬇️  Downloading resource types');
    const url = urlFromArgsOrDefault(urlFromArgs);
    const resourceTypes = await downloadResourceTypes(url);

    const generatedClass = generateClass(resourceTypes);
    const filepath = await createFileFromContent(generatedClass);
    formatDartFile(filepath);
    console.log(`✅ Successfully generated file at:\n${filepath}`);
  } catch (error) {
    console.error(`? ${error}`);
  }
};

// If only default arguments are provided set url to null
const { argv } = process;
const url = argv.length > 2 ? argv[argv.length - 1] : null;

main(url);
