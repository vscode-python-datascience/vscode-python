// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { IServiceManager } from '../ioc/types';
import { CodeWatcher } from './codewatcher';
import { DataScienceCodeLensProvider } from './codelensprovider';
import { DataScience } from './datascience';
import { JupyterServerProvider } from './jupyterserverprovider';
import { ICodeWatcher, IDataScience, IDataScienceCodeLensProvider, IJupyterServerProvider } from './types';

export function registerTypes(serviceManager: IServiceManager) {
    serviceManager.addSingleton<ICodeWatcher>(ICodeWatcher, CodeWatcher);
    serviceManager.addSingleton<IDataScienceCodeLensProvider>(IDataScienceCodeLensProvider, DataScienceCodeLensProvider);
    serviceManager.addSingleton<IDataScience>(IDataScience, DataScience);
    serviceManager.addSingleton<IJupyterServerProvider>(IJupyterServerProvider, JupyterServerProvider);
}
