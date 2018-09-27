// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { Architecture, OSType } from '../../utils/platform';
import { log } from '../common/logger';
import { INugetRepository, INugetService, NugetPackage } from '../common/nuget/types';
import { IPlatformService } from '../common/platform/types';
import { IConfigurationService } from '../common/types';
import { IServiceContainer } from '../ioc/types';
import { PlatformName } from './platformData';
import { ILanguageServerPackageService } from './types';

const downloadBaseFileName = 'Python-Language-Server';
export const maxMajorVersion = 0;
export const PackageNames = {
    [PlatformName.Windows32Bit]: `${downloadBaseFileName}-${PlatformName.Windows32Bit}`,
    [PlatformName.Windows64Bit]: `${downloadBaseFileName}-${PlatformName.Windows64Bit}`,
    [PlatformName.Linux64Bit]: `${downloadBaseFileName}-${PlatformName.Linux64Bit}`,
    [PlatformName.Mac64Bit]: `${downloadBaseFileName}-${PlatformName.Mac64Bit}`
};

export const DefaultLanguageServerDownloadChannel = 'beta';

@injectable()
export class LanguageServerPackageService implements ILanguageServerPackageService {
    public maxMajorVersion: number = maxMajorVersion;
    constructor(@inject(IServiceContainer) protected readonly serviceContainer: IServiceContainer) { }
    public getNugetPackageName(): string {
        const plaform = this.serviceContainer.get<IPlatformService>(IPlatformService);
        switch (plaform.info.type) {
            case OSType.Windows: {
                const is64Bit = plaform.info.architecture === Architecture.x64;
                return PackageNames[is64Bit ? PlatformName.Windows64Bit : PlatformName.Windows32Bit];
            }
            case OSType.OSX: {
                return PackageNames[PlatformName.Mac64Bit];
            }
            default: {
                return PackageNames[PlatformName.Linux64Bit];
            }
        }
    }

    @log('Get latest language server nuget package version')
    public async getLatestNugetPackageVersion(): Promise<NugetPackage> {
        const downloadChannel = this.getLanguageServerDownloadChannel();
        const nugetRepo = this.serviceContainer.get<INugetRepository>(INugetRepository, downloadChannel);
        const nugetService = this.serviceContainer.get<INugetService>(INugetService);
        const packageName = this.getNugetPackageName();
        log(`Listing packages for ${downloadChannel} for ${packageName}`);
        const packages = await nugetRepo.getPackages(packageName);

        const validPackages = packages
            .filter(item => item.version.major === this.maxMajorVersion)
            .filter(item => nugetService.isReleaseVersion(item.version))
            .sort((a, b) => a.version.compare(b.version));
        return validPackages[validPackages.length - 1];
    }

    public getLanguageServerDownloadChannel() {
        const configService = this.serviceContainer.get<IConfigurationService>(IConfigurationService);
        const settings = configService.getSettings();
        return settings.analysis.downloadChannel || DefaultLanguageServerDownloadChannel;
    }
}
