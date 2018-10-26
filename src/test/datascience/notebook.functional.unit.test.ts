// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

import { nbformat } from '@jupyterlab/coreutils';
import * as assert from 'assert';
import * as TypeMoq from 'typemoq';
import { Disposable } from 'vscode';

import { IFileSystem } from '../../client/common/platform/types';
import { IPythonExecutionFactory, IPythonExecutionService } from '../../client/common/process/types';
import { ILogger } from '../../client/common/types';
import { MockPythonExecutionService } from './executionServiceMock';
import { JupyterServer } from '../../client/datascience/jupyterServer';
import { JupyterProcess } from '../../client/datascience/jupyterProcess';
import { JupyterAvailability } from '../../client/datascience/jupyterAvailability';

suite('Jupyter notebook tests', () => {
    let fileSystem: TypeMoq.IMock<IFileSystem>;
    let logger: TypeMoq.IMock<ILogger>;
    const disposables: Disposable[] = [];
    let availability: JupyterAvailability;
    let pythonExecutionService : IPythonExecutionService;
    let factory : TypeMoq.IMock<IPythonExecutionFactory>;
    let jupyterServer : JupyterServer;
    let jupyterProcess : JupyterProcess;

    setup(() => {
        pythonExecutionService = new MockPythonExecutionService();
        fileSystem = TypeMoq.Mock.ofType<IFileSystem>();
        logger = TypeMoq.Mock.ofType<ILogger>();
        factory = TypeMoq.Mock.ofType<IPythonExecutionFactory>();

        factory.setup(f => f.create(TypeMoq.It.isAny())).returns(() => Promise.resolve(pythonExecutionService));
        fileSystem.setup(f => f.getFileHash(TypeMoq.It.isAny())).returns(() => Promise.resolve('42'));

        // tslint:disable-next-line:no-empty
        logger.setup(l => l.logInformation(TypeMoq.It.isAny())).returns((m) => {}); // console.log(m)); // REnable this to debug the server
        jupyterProcess = new JupyterProcess(pythonExecutionService);
        jupyterServer = new JupyterServer(logger.object, jupyterProcess, availability);
    });

    teardown(() => {
        disposables.forEach(disposable => {
            if (disposable) {
                disposable.dispose();
            }
        });
    });

    test('Creation', async () => {
        if (await availability.isNotebookSupported()) {
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
            const cells = await server.execute('a = 1\r\na', 'foo.py', 2);
            assert.equal(cells.length, 1, 'Wrong number of cells returned');
            assert.equal(cells[0].data.cell_type, 'code', 'Wrong type of cell returned');
            const cell = cells[0].data as nbformat.ICodeCell;
            assert.equal(cell.outputs.length, 1, 'Cell length not correct');
            const data = cell.outputs[0].data;
            assert.ok(data, 'No data object on the cell');
            if (data) { // For linter
                assert.ok(data.hasOwnProperty('text/plain'), 'Cell mime type not correct');
                assert.ok(data['text/plain'], 'Cell mime type not correct');
                assert.equal(data['text/plain'], '1', 'Cell not correct');
                assert.ok(statusCount >= 2, 'Status wasnt updated');
            }
        } else {
            // tslint:disable-next-line:no-console
            console.log('Execution test skipped, no Jupyter installed');
        }
    }).timeout(60000);

});
