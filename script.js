function getHardhatRuntimeEnvironment() {
  try {
    return require("hardhat");
  } catch (e) {
    // Hardhat is not installed
    return undefined;
  }
}

async function main() {
  const hre = getHardhatRuntimeEnvironment();
  if (hre === undefined) {
    return;
  }

  const {
    TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
    TASK_COMPILE_SOLIDITY_GET_SOURCE_NAMES,
    TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH,
    TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE,
    TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT,
    TASK_COMPILE_SOLIDITY_COMPILE
  } = require("hardhat/builtin-tasks/task-names");

  const {
    getSolidityFilesCachePath,
    SolidityFilesCache,
  } = require("hardhat/builtin-tasks/utils/solidity-files-cache");

  const sourcePaths = await hre.run(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS);

  const sourceNames = await hre.run(TASK_COMPILE_SOLIDITY_GET_SOURCE_NAMES, {
    sourcePaths,
  });

  const solidityFilesCachePath = getSolidityFilesCachePath(hre.config.paths);
  let solidityFilesCache = await SolidityFilesCache.readFromFile(
    solidityFilesCachePath
  );

  const dependencyGraph = await hre.run(
    TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH,
    {
      sourceNames,
      solidityFilesCache,
    }
  );

  const targetFileAbsolutePath = `${__dirname}/contracts/Foo.sol`;
  const resolvedFile = dependencyGraph
    .getResolvedFiles()
    .filter((f) => f.absolutePath === targetFileAbsolutePath)[0];

  const compilationJob = await hre.run(
    TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE,
    {
      file: resolvedFile,
      dependencyGraph,
      solidityFilesCache,
    }
  );


  //////////////////////////////////////
  const modifiedFiles = {
    [targetFileAbsolutePath]: `
contract Foo {
`
  }

  compilationJob.getResolvedFiles()
    .forEach(file => {
      if (modifiedFiles[file.absolutePath]) {
        file.content.rawContent = modifiedFiles[file.absolutePath]
      }
    })
  //////////////////////////////////////

  const input = await hre.run(
    TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT,
    {
      compilationJob,
    }
  );

  const { output } = await hre.run(TASK_COMPILE_SOLIDITY_COMPILE, {
    solcVersion: compilationJob.getSolcConfig().version,
    input,
    quiet: true,
    compilationJob,
    compilationJobs: [compilationJob],
    compilationJobIndex: 0,
  });

  console.log(output)
}

main().catch(console.error);
