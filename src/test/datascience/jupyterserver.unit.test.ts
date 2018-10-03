// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as TypeMoq from 'typemoq';
import { IFileSystem } from '../../client/common/platform/types';
import { JupyterServer } from '../../client/datascience/jupyterServer';
import * as assert from 'assert';

suite('Jupyter server tests', () => {
    let fileSystem: TypeMoq.IMock<IFileSystem>;
    setup(() => {
        fileSystem = TypeMoq.Mock.ofType<IFileSystem>();
        fileSystem.setup(f => f.getFileHash(TypeMoq.It.isAny())).returns(() => Promise.resolve('42'));
    });

    test('Creation', async () => {
        const server = new JupyterServer(this.fileSystem);
        const result = await server.start();
        assert.equal(result, true, "Server didn't start");
    });

});
