// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { AzureBlobStoreNugetRepository } from '../../common/nuget/azureBlobStoreNugetRepository';
import { IServiceContainer } from '../../ioc/types';

const azureBlobStorageAccount = 'https://pvsc.blob.core.windows.net';

export enum LanguageServerDownloadChannel {
    stable = 'stable',
    beta = 'beta',
    daily = 'daily'
}

export enum LanguageServerPackageStorageContainers {
    stable = 'python-language-server-stable',
    beta = 'python-language-server-beta',
    daily = 'python-language-server-daily'
}

@injectable()
export class StableLanguageServerPackageRepository extends AzureBlobStoreNugetRepository {
    constructor(@inject(IServiceContainer) serviceContainer: IServiceContainer) {
        super(serviceContainer, azureBlobStorageAccount, LanguageServerPackageStorageContainers.stable);
    }
}

@injectable()
export class BetaLanguageServerPackageRepository extends AzureBlobStoreNugetRepository {
    constructor(@inject(IServiceContainer) serviceContainer: IServiceContainer) {
        super(serviceContainer, azureBlobStorageAccount, LanguageServerPackageStorageContainers.beta);
    }
}

@injectable()
export class DailyLanguageServerPackageRepository extends AzureBlobStoreNugetRepository {
    constructor(@inject(IServiceContainer) serviceContainer: IServiceContainer) {
        super(serviceContainer, azureBlobStorageAccount, LanguageServerPackageStorageContainers.daily);
    }
}
