// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as TypeMoq from 'typemoq';
import { IApplicationShell, ICommandManager } from '../../client/common/application/types';
import { IDisposableRegistry } from '../../client/common/types';
import { DataScience } from '../../client/datascience/datascience';
import { IDataScience } from '../../client/datascience/types';
import { IServiceContainer } from '../../client/ioc/types';

suite('History Unit Tests', () => {
    let serviceContainer: TypeMoq.IMock<IServiceContainer>;
    let shell: TypeMoq.IMock<IApplicationShell>;
    let commandManager: TypeMoq.IMock<ICommandManager>;
    let disposableRegistry: TypeMoq.IMock<IDisposableRegistry>;
    let dataScience: IDataScience;
    setup(() => {
        serviceContainer = TypeMoq.Mock.ofType<IServiceContainer>();
        commandManager = TypeMoq.Mock.ofType<ICommandManager>();
        disposableRegistry = TypeMoq.Mock.ofType<IDisposableRegistry>();
        shell = TypeMoq.Mock.ofType<IApplicationShell>();
        serviceContainer.setup(c => c.get(ICommandManager)).returns(() => commandManager.object);
        serviceContainer.setup(c => c.get(IApplicationShell)).returns(() => shell.object);
        serviceContainer.setup(c => c.get(IDisposableRegistry)).returns(() => disposableRegistry.object);

        dataScience = new DataScience(serviceContainer.object);
    });
});
