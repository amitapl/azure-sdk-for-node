var fs = require('fs');
var pathUtil = require('path');

var templatesDir = __dirname;

exports.generateDeploymentScript = function (repositoryRoot, projectType, projectPath, solutionPath) {
    argNotNull(projectType, "projectType");

    projectType = projectType.toUpperCase();
    if (projectType === "WAP") {
        generateWapDeploymentScript(repositoryRoot, projectPath, solutionPath);
    }
    else if (projectType === "WEBSITE") {
        generateWebSiteDeploymentScript(repositoryRoot, solutionPath);
    }
    else {
        throw new Error("Invalid project type received: " + projectType);
    }
}

function generateWapDeploymentScript(repositoryRoot, projectPath, solutionPath) {
    argNotNull(projectPath, "projectPath");

    var relativeProjectPath = pathUtil.relative(repositoryRoot, projectPath);
    var relativeSolutionPath = pathUtil.relative(repositoryRoot, solutionPath);

    var msbuildArguments = "\"%DEPLOYMENT_SOURCE%\\" + relativeProjectPath + "\" /nologo /verbosity:m /t:pipelinePreDeployCopyAllFilesToOneFolder /p:_PackageTempDir=\"%DEPLOYMENT_TEMP%\";AutoParameterizationWebConfigConnectionStrings=false;Configuration=Release";
    if (solutionPath != null) {
        msbuildArguments += " /p:SolutionDir=\"%DEPLOYMENT_SOURCE%\\" + relativeSolutionPath + "\"";
    }

    generateDotNetDeploymentScript("deploy.wap.template", msbuildArguments);
}

function generateWebSiteDeploymentScript(repositoryRoot, solutionPath) {

    if (solutionPath == null) {
        throw new Error("The solution file path is required for .NET web site deployment script");
    }

    var relativeSolutionPath = pathUtil.relative(repositoryRoot, solutionPath);

    var msbuildArguments = "\"%DEPLOYMENT_SOURCE%\\" + relativeSolutionPath + "\" /verbosity:m /nologo";
    generateDotNetDeploymentScript("deploy.website.template", msbuildArguments);
}

function generateDotNetDeploymentScript(templateFileName, msbuildArguments) {
    argNotNull(templateFileName, "templateFileName");

    var prefixContent = fs.readFileSync(getTemplatePath("deploy.prefix.template"), "utf8");
    var specificTemplateContent = fs.readFileSync(getTemplatePath(templateFileName), "utf8");
    var postfixContent = fs.readFileSync(getTemplatePath("deploy.postfix.template"), "utf8");

    var templateContent = prefixContent + specificTemplateContent + postfixContent;
    templateContent =
        templateContent.replace("{MSBuildArguments}", msbuildArguments);

    var deployScriptFileName = "deploy.cmd";

    // Write the custom deployment script
    writeContentToFile(deployScriptFileName, templateContent);

    // Write the .deployment file
    writeContentToFile(".deployment", "[config]\ncommand = " + deployScriptFileName);
}

function getTemplatePath(fileName) {
    return pathUtil.join(templatesDir, fileName);
}

function writeContentToFile(path, content) {
    fs.writeFileSync(path, content);
}

function argNotNull(arg, argName) {
    if (arg === null || arg === undefined) {
        throw new Error("The argument '" + argName + "' is null");
    }
}
