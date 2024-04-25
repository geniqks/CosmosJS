import { ConfigService } from '@config/config';
import { loadModule } from '@helpers/module.helper';
import { Environment, IocContainer } from 'src';
import type { IBootstrapConfig, IHttpServe } from '../interfaces';

class AppBootstrap {
  private config: IBootstrapConfig<any> = {} as IBootstrapConfig;

  public async defineConfigAndBootstrapApp(config: (injectedConfig: ConfigService) => IBootstrapConfig): Promise<IHttpServe | void> {
    let returnedConfig: IHttpServe | void = undefined;
    const configService = IocContainer.container.get(ConfigService);
    this.config = config(configService);

    this.processEnv();
    await this.bindApp();
    returnedConfig = await this.loadHttp();
    await this.loadEntrypoint();

    return returnedConfig;
  }

  /**
   * Bind all object to inversify
   */
  private async bindApp(): Promise<void> {
    const iocBindingLoader = await loadModule(this.config.loaders.ioc);
    iocBindingLoader(IocContainer.container);
  }

  /**
   * Process env variables
   */
  private async processEnv(): Promise<void> {
    const env = IocContainer.container.get(Environment);
    const envLoader = await loadModule(this.config.loaders.env);
    env.process(envLoader);
  }

  /**
   *  Load http server
   */
  private async loadHttp(): Promise<void | IHttpServe> {
    if (this.config.adapters?.server) {
      const server = await this.config.adapters?.server.provider();
      server.HttpFactory.bindContainers(IocContainer.container);

      if (this.config.adapters?.server.exceptions) {
        const exceptionHandler = await loadModule(this.config.adapters?.server.exceptions);
        server.HttpFactory.exceptionHandler(exceptionHandler);
      }
      const { provider, exceptions, ...httpConfig } = this.config.adapters.server;
      return server.HttpFactory.listen(httpConfig);
    }
  }

  /**
   * Load and run entrypoint
   */
  private async loadEntrypoint(): Promise<void> {
    if (this.config.entrypoint) {
      const entrypoint = await loadModule(this.config.entrypoint);
      await entrypoint();
    }
  }
}

export const AppFactory = new AppBootstrap();
