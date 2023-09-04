import * as path from "node:path";
import { NxMonorepoProject, NxProject } from "@aws-prototyping-sdk/nx-monorepo";
import {
  DocumentationFormat,
  Language,
  Library,
  ModelLanguage,
  TypeSafeApiProject,
} from "@aws-prototyping-sdk/type-safe-api";
import { TypeScriptProject } from "projen/lib/typescript";
import { AWS_SDK_VERSION, DEFAULT_RELEASE_BRANCH, PROJECT_AUTHOR } from "../constants";
import { NodePackageManager } from "projen/lib/javascript";

export interface ApiOptions {
  readonly monorepo: NxMonorepoProject;
  readonly rootOutdir: string;
  readonly serviceName?: string;
}

export class Api {
  public readonly project: TypeSafeApiProject;
  public readonly apiInterceptorsTs: TypeScriptProject;

  constructor(options: ApiOptions) {
    const { monorepo, rootOutdir, serviceName = "MyApi" } = options;

    this.project = new TypeSafeApiProject({
      parent: monorepo,
      outdir: path.join(rootOutdir, "api"),
      name: "api",
      model: {
        language: ModelLanguage.SMITHY,
        options: {
          smithy: {
            serviceName: {
              namespace: "com.amazon",
              serviceName,
            },
          },
        },
      },
      runtime: {
        languages: [Language.TYPESCRIPT, Language.PYTHON],
      },
      infrastructure: {
        language: Language.TYPESCRIPT,
      },
      library: {
        libraries: [Library.TYPESCRIPT_REACT_QUERY_HOOKS],
      },
      documentation: {
        formats: [DocumentationFormat.HTML2],
      },
    });
    this.project.runtime.typescript!.package.addField("private", true);
    this.project.runtime.python!.addDependency("python@>=3.10,<4.0");
    this.project.runtime.python!.addDependency("certifi@^2023.5.7");
    this.project.runtime.python!.addDependency("urllib3@>=1.25.4,<1.27");
    this.project.runtime.python!.addDependency("typing_extensions@^4.7.1");
    // Initial build fails intermittency stating this file is missing, no sure why it is needed.
    // For now adding to commit so persists.
    this.project.runtime.python!.gitignore.include("README.md");

    NxProject.ensure(this.project.model)?.addBuildTargetFiles(
      ["!{projectRoot}/.gradle/**/*"],
      ["{projectRoot}/.api.json", "{projectRoot}/.gradle"]
    );
    NxProject.ensure(this.project.documentation.html2!)?.addBuildTargetFiles(
      ["!{projectRoot}/index.html", "!{projectRoot}/.openapi-generator/**/*"],
      ["{projectRoot}/index.html"]
    );
    NxProject.ensure(this.project.infrastructure.typescript!).addBuildTargetFiles(
      [],
      ["{projectRoot}/mocks", "{projectRoot}/assets"]
    );
    NxProject.ensure(
      this.project.library.typescriptReactQueryHooks!
    ).addImplicitDependency(this.project.runtime.typescript!);

    // Extend api runtime libraries with interceptors and other functionality
    this.apiInterceptorsTs = new TypeScriptProject({
      ...PROJECT_AUTHOR,
      parent: monorepo,
      outdir: "demo/api/interceptors/typescript",
      name: "api-typescript-interceptors",
      packageManager: NodePackageManager.PNPM,
      defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
      prettier: true,
      npmignoreEnabled: false,
      deps: [
        this.project.runtime.typescript!.package.packageName,
        `@aws-sdk/client-cognito-identity-provider@^${AWS_SDK_VERSION}`,
        "nanoid",
        "node-cache",
        "@aws-lambda-powertools/logger",
        "@aws-lambda-powertools/tracer",
        "jose",
        "node-fetch",
      ],
      devDeps: [
        "aws-sdk-client-mock",
        "@aws-sdk/types",
        "aws-lambda",
        "@types/aws-lambda",
        "@types/node-fetch",
        "mock-jwks",
      ],
      tsconfig: {
        compilerOptions: {
          lib: ["dom", "ES2019"],
          skipLibCheck: true,
          target: "ES2019",
        },
      },
      tsconfigDev: {
        compilerOptions: {
          lib: ["dom", "ES2019"],
          skipLibCheck: true,
          target: "ES2019",
        },
      },
    });
    this.apiInterceptorsTs.package.addField("private", true);
  }
}
