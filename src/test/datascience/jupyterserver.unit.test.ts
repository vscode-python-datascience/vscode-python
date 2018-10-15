// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as assert from 'assert';
import * as TypeMoq from 'typemoq';
import { Disposable } from 'vscode';
import { IFileSystem } from '../../client/common/platform/types';
import { IPythonExecutionFactory, IPythonExecutionService } from '../../client/common/process/types';
import { ILogger } from '../../client/common/types';
import { JupyterServerProvider } from '../../client/datascience/jupyterServerProvider';
import { IJupyterServerProvider } from '../../client/datascience/types';
import { MockPythonExecutionService } from './executionServiceMock';

suite('Jupyter server tests', () => {
    let fileSystem: TypeMoq.IMock<IFileSystem>;
    let logger: TypeMoq.IMock<ILogger>;
    const disposables: Disposable[] = [];
    let serverProvider: IJupyterServerProvider;
    let pythonExecutionService : IPythonExecutionService;
    let factory : TypeMoq.IMock<IPythonExecutionFactory>;

    setup(() => {
        pythonExecutionService = new MockPythonExecutionService();
        fileSystem = TypeMoq.Mock.ofType<IFileSystem>();
        logger = TypeMoq.Mock.ofType<ILogger>();
        factory = TypeMoq.Mock.ofType<IPythonExecutionFactory>();

        factory.setup(f => f.create(TypeMoq.It.isAny())).returns(() => Promise.resolve(pythonExecutionService));
        fileSystem.setup(f => f.getFileHash(TypeMoq.It.isAny())).returns(() => Promise.resolve('42'));

        // tslint:disable-next-line:no-empty
        logger.setup(l => l.logInformation(TypeMoq.It.isAny())).returns((m) => {}); // console.log(m)); // REnable this to debug the server
        serverProvider = new JupyterServerProvider(disposables, logger.object, fileSystem.object, factory.object);
    });

    teardown(() => {
        disposables.forEach(disposable => {
            if (disposable) {
                disposable.dispose();
            }
        });
    });

    test('Creation', async () => {
        if (await serverProvider.isSupported()) {
            const server = await serverProvider.start();
            if (!server) {
                assert.fail('Server not created');
            }
        } else {
            // tslint:disable-next-line:no-console
            console.log('Creation test skipped, no Jupyter installed');
        }
    }).timeout(60000);

    test('Execution', async () => {
        if (await serverProvider.isSupported()) {
            const server = await serverProvider.start();
            if (!server) {
                assert.fail('Server not created');
            }
            let statusCount: number = 0;
            server.onStatusChanged((bool: boolean) => {
                statusCount += 1;
            });
            const cell = await server.execute('a = 1\r\na', 'foo.py', 2);
            assert.ok(cell.output.hasOwnProperty('text/plain'), 'Cell mime type not correct');
            assert.equal(cell.output['text/plain'], '1', 'Cell not correct');
            assert.ok(statusCount >= 2, 'Status wasnt updated');
        } else {
            // tslint:disable-next-line:no-console
            console.log('Execution test skipped, no Jupyter installed');
        }
    }).timeout(60000);

});
