import { KubernetesCommandLineToolsExecutor } from '../../utils/KubernetesCommandLineToolsExecutor';
import { expect } from 'chai';
import { ShellString } from 'shelljs';
import { APITestConstants} from '../../constants/APITestConstants';
import {StringUtil} from "../../utils/StringUtil";
import {BaseTestConstants} from "../../constants/BaseTestConstants";

const gitRepository: string = 'https://github.com/crw-qe/web-nodejs-sample';

suite(`Test cloning of repo "${gitRepository}" into empty workspace.`, async function (): Promise<void> {
    // works only for root user
    const namespace: string = 'admin-devspaces';
    const workspaceName: string = 'empty';
    const clonedProjectName: string = StringUtil.getProjectNameFromGitUrl(gitRepository);
    let containerWorkDir: string = '';
    let containerTerminal: KubernetesCommandLineToolsExecutor.ContainerTerminal;

    const kubernetesCommandLineToolsExecutor: KubernetesCommandLineToolsExecutor = new KubernetesCommandLineToolsExecutor(workspaceName, namespace);
    containerTerminal = new KubernetesCommandLineToolsExecutor.ContainerTerminal(kubernetesCommandLineToolsExecutor);


    const emptyYaml: string =
        'apiVersion: workspace.devfile.io/v1alpha2\n' +
        'kind: DevWorkspaceTemplate\n' +
        'metadata:\n' +
        '  name: che-code-empty\n' +
        'spec:\n' +
        '  commands:\n' +
        '    - id: init-container-command\n' +
        '      apply:\n' +
        '        component: che-code-injector\n' +
        '    - id: init-che-code-command\n' +
        '      exec:\n' +
        '        component: che-code-runtime-description\n' +
        '        commandLine: nohup /checode/entrypoint-volume.sh > /checode/entrypoint-logs.txt\n' +
        '          2>&1 &\n' +
        '  events:\n' +
        '    preStart:\n' +
        '      - init-container-command\n' +
        '    postStart:\n' +
        '      - init-che-code-command\n' +
        '  components:\n' +
        '    - name: che-code-runtime-description\n' +
        '      container:\n' +
        `        image: ${APITestConstants.TS_API_TEST_UDI_IMAGE}\n` +
        '        env:\n' +
        '          - name: CODE_HOST\n' +
        '            value: 0.0.0.0\n' +
        '        volumeMounts:\n' +
        '          - name: checode\n' +
        '            path: /checode\n' +
        '        memoryLimit: 1024Mi\n' +
        '        memoryRequest: 256Mi\n' +
        '        cpuLimit: 500m\n' +
        '        cpuRequest: 30m\n' +
        '        endpoints:\n' +
        '          - name: che-code\n' +
        '            attributes:\n' +
        '              type: main\n' +
        '              cookiesAuthEnabled: true\n' +
        '              discoverable: false\n' +
        '              urlRewriteSupported: true\n' +
        '            targetPort: 3100\n' +
        '            exposure: public\n' +
        '            secure: false\n' +
        '            protocol: https\n' +
        '          - name: code-redirect-1\n' +
        '            attributes:\n' +
        '              discoverable: false\n' +
        '              urlRewriteSupported: false\n' +
        '            targetPort: 13131\n' +
        '            exposure: public\n' +
        '            protocol: http\n' +
        '          - name: code-redirect-2\n' +
        '            attributes:\n' +
        '              discoverable: false\n' +
        '              urlRewriteSupported: false\n' +
        '            targetPort: 13132\n' +
        '            exposure: public\n' +
        '            protocol: http\n' +
        '          - name: code-redirect-3\n' +
        '            attributes:\n' +
        '              discoverable: false\n' +
        '              urlRewriteSupported: false\n' +
        '            targetPort: 13133\n' +
        '            exposure: public\n' +
        '            protocol: http\n' +
        '      attributes:\n' +
        '        app.kubernetes.io/component: che-code-runtime\n' +
        '        app.kubernetes.io/part-of: che-code.eclipse.org\n' +
        '        controller.devfile.io/container-contribution: true\n' +
        '    - name: checode\n' +
        '      volume: {}\n' +
        '    - name: che-code-injector\n' +
        '      container:\n' +
        '        image: quay.io/che-incubator/che-code:latest\n' +
        '        command:\n' +
        '          - /entrypoint-init-container.sh\n' +
        '        volumeMounts:\n' +
        '          - name: checode\n' +
        '            path: /checode\n' +
        '        memoryLimit: 256Mi\n' +
        '        memoryRequest: 32Mi\n' +
        '        cpuLimit: 500m\n' +
        '        cpuRequest: 30m\n' +
        '---\n' +
        'apiVersion: workspace.devfile.io/v1alpha2\n' +
        'kind: DevWorkspace\n' +
        'metadata:\n' +
        '  name: empty\n' +
        '  annotations:\n' +
        '    che.eclipse.org/devfile: |\n' +
        '      schemaVersion: 2.2.0\n' +
        '      metadata:\n' +
        '        name: empty\n' +
        'spec:\n' +
        '  started: true\n' +
        '  template: {}\n' +
        '  contributions:\n' +
        '    - name: editor\n' +
        '      kubernetes:\n' +
        '        name: che-code-empty';

    suiteSetup('Create empty workspace with OC client', function (): void {
        kubernetesCommandLineToolsExecutor.loginToOcp();
        kubernetesCommandLineToolsExecutor.applyAndWaitDevWorkspace(emptyYaml);
    });

    suiteTeardown('Delete workspace', function (): void {
        kubernetesCommandLineToolsExecutor.deleteDevWorkspace();
    });

    suite('Clone public repo without previous setup', function (): void {
        test('Check if public repo can be cloned', function (): void {
            containerWorkDir = containerTerminal.pwd().stdout.replace('\n', '');
            const cloneOutput: ShellString = containerTerminal.gitClone(gitRepository);
            expect(cloneOutput.stdout + cloneOutput.stderr).includes('Cloning');
        });

        test('Check if project was created', function (): void {
            expect(containerTerminal.ls().stdout).includes(clonedProjectName);
        });

        test('Check if files were imported ', function (): void {
            expect(containerTerminal.ls(`${containerWorkDir}/${clonedProjectName}`).stdout).includes(BaseTestConstants.TS_SELENIUM_PROJECT_ROOT_FILE_NAME);
        });
    });
});


