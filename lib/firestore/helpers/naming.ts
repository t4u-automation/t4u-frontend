/**
 * Generate unique name with suffix if name exists
 */
export function generateUniqueName(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let counter = 2;
  let newName = `${baseName} (${counter})`;
  
  while (existingNames.includes(newName)) {
    counter++;
    newName = `${baseName} (${counter})`;
  }
  
  return newName;
}
