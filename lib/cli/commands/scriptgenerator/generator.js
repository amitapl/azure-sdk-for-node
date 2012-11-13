var fs = require('fs');
var path = require('path');

var fs = require('fs');
if (!fs.existsSync) {
    fs.existsSync = pathUtil.existsSync;
}

var templatesDir = __dirname;
var log = function () { };

exports.generateDeploymentScript = function (repositoryRoot, projectType, projectPath, solutionPath, logger) {
    argNotNull(projectType, "projectType");

    log = logger || log;

    if (!repositoryRoot) {
        repositoryRoot = ".";
    }

    projectType = projectType.toUpperCase();
    if (projectType === "WAP") {
        generateWapDeploymentScript(repositoryRoot, projectPath, solutionPath);
    }
    else if (projectType === "WEBSITE") {
        generateWebSiteDeploymentScript(repositoryRoot, solutionPath);
    }
    else if (projectType === "NODE") {
        generateNodeDeploymentScript(repositoryRoot);
    }
    else {
        throw new Error("Invalid project type received: " + projectType);
    }
}

function generateNodeDeploymentScript(repositoryRoot) {
    argNotNull(repositoryRoot, "repositoryRoot");

    createIisNodeWebConfigIfNeeded(repositoryRoot);

    generateBasicDeploymentScript("deploy.node.template");
}

function getNodeStartFile(repositoryRoot) {
    var nodeStartFiles = ["server.js", "app.js"];

    for (var i in nodeStartFiles) {
        var nodeStartFilePath = path.join(repositoryRoot, nodeStartFiles[i]);
        // TODO: Change to async and add retry
        if (fs.existsSync(nodeStartFilePath)) {
            return nodeStartFilePath;
        }
    }

    return null;
}

function createIisNodeWebConfigIfNeeded(repositoryRoot) {
    var webConfigPath = path.join(repositoryRoot, "web.config");

    if (!fs.existsSync(webConfigPath)) {
        log.info("Creating Web.config to enable Node.js activation.");

        var nodeStartFilePath = getNodeStartFile(repositoryRoot);
        if (!nodeStartFilePath) {
            throw new Error("Missing server.js/app.js file which is required for a node.js site");
        }

        var webConfigContent = getTemplateContent("iisnode.config.template");
        webConfigContent =
            webConfigContent.replace("{NodeStartFile}", nodeStartFilePath);
        writeContentToFile(webConfigPath, webConfigContent);
    }
}

function generateWapDeploymentScript(repositoryRoot, projectPath, solutionPath) {
    argNotNull(repositoryRoot, "repositoryRoot");
    argNotNull(projectPath, "projectPath");

    var relativeProjectPath = path.relative(repositoryRoot, projectPath);
    var relativeSolutionPath = path.relative(repositoryRoot, solutionPath);

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

    var relativeSolutionPath = path.relative(repositoryRoot, solutionPath);

    var msbuildArguments = "\"%DEPLOYMENT_SOURCE%\\" + relativeSolutionPath + "\" /verbosity:m /nologo";
    generateDotNetDeploymentScript("deploy.website.template", msbuildArguments);
}

function generateBasicDeploymentScript(templateFileName) {
    argNotNull(templateFileName, "templateFileName");

    var templateContent = getTemplatesContent([ "deploy.prefix.template", templateFileName, "deploy.postfix.template" ]);

    writeDeploymentFiles(templateContent);
}

function generateDotNetDeploymentScript(templateFileName, msbuildArguments) {
    argNotNull(templateFileName, "templateFileName");

    var templateContent = getTemplatesContent(["deploy.prefix.template", "deploy.dotnet.template", templateFileName, "deploy.postfix.template"]);
    templateContent =
        templateContent.replace("{MSBuildArguments}", msbuildArguments);

    writeDeploymentFiles(templateContent);
}

function getTemplatesContent(fileNames) {
    var content = "";

    for (var i in fileNames) {
        content += getTemplateContent(fileNames[i]);
    }

    return content;
}

function writeDeploymentFiles(templateContent) {
    argNotNull(templateContent, "templateContent");

    var deployScriptFileName = "deploy.cmd";

    // Write the custom deployment script
    writeContentToFile(deployScriptFileName, templateContent);

    // Write the .deployment file
    writeContentToFile(".deployment", "[config]\ncommand = " + deployScriptFileName);
}

function getTemplateContent(templateFileName) {
    return fs.readFileSync(getTemplatePath(templateFileName), "utf8");
}

function getTemplatePath(fileName) {
    return path.join(templatesDir, fileName);
}

function writeContentToFile(path, content) {
    fs.writeFileSync(path, content);
}

function argNotNull(arg, argName) {
    if (arg === null || arg === undefined) {
        throw new Error("The argument '" + argName + "' is null");
    }
}
