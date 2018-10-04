// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as TypeMoq from 'typemoq';
import { IFileSystem } from '../../client/common/platform/types';
import { JupyterServerProvider } from '../../client/datascience/jupyterServerProvider';
import * as assert from 'assert';
import { UnitTestIocContainer } from '../unittests/serviceRegistry';
import { IJupyterServerProvider } from '../../client/datascience/types';
import { IDisposableRegistry } from '../../client/common/types';
import { Disposable } from 'vscode';
import { IServiceContainer } from '../../client/ioc/types';

suite('Jupyter server tests', () => {
    let fileSystem: TypeMoq.IMock<IFileSystem>;
    let serviceContainer: TypeMoq.IMock<IServiceContainer>;
    let disposables: Disposable[] = [];
    let serverProvider: IJupyterServerProvider;

    setup(() => {
        serviceContainer = TypeMoq.Mock.ofType<IServiceContainer>();
        fileSystem = TypeMoq.Mock.ofType<IFileSystem>();
        fileSystem.setup(f => f.getFileHash(TypeMoq.It.isAny())).returns(() => Promise.resolve('42'));
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(IDisposableRegistry), TypeMoq.It.isAny())).returns(() => disposables);
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(IFileSystem), TypeMoq.It.isAny())).returns(() => fileSystem.object);
        serverProvider = new JupyterServerProvider(serviceContainer.object);
    });

    teardown(() => {
        disposables.forEach(disposable => {
            if (disposable) {
                disposable.dispose();
            }
        });
    });

    test('Creation', async () => {
        const server = await serverProvider.start();
        if (!server) {
            assert.fail('Server not created');
        }
    });

    test('Execution', async () => {
        const server = await serverProvider.start();
        if (!server) {
            assert.fail('Server not created');
        }
        const cell = await server.execute('a = 1\r\na', 'foo.py', 2);
        assert.equal(cell.output, '<html>', 'Cell not correct');
    });

});
