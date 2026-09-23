const { withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
module.exports = config => withXcodeProject(config, config => {
  const name = config.modRequest.projectName;
  const source = path.join(config.modRequest.platformProjectRoot, name, 'BabyQuickRecord.swift');
  fs.copyFileSync(path.join(__dirname, '../native/BabyQuickRecord.swift'), source);
  const project = config.modResults;
  if (!project.hasFile(`${name}/BabyQuickRecord.swift`)) project.addSourceFile(`${name}/BabyQuickRecord.swift`, { target: project.getFirstTarget().uuid }, project.getFirstProject().firstProject.mainGroup);
  return config;
});
