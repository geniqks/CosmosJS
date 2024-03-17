import { Env, IocContainer } from 'src';
import type { IBootstrapConfig } from '../interfaces';

async function loadModule(importedModule: any) {
	try {
		const module = await importedModule();
		return module.default;
	} catch (error: any) {
		throw new Error(`Error loading module ${importedModule}: ${error?.message}`);
	}
}
// TODO: refacto this file later
export async function defineConfigAndBootstrapApp(config: IBootstrapConfig): Promise<{
	port: number;
	fetch: any;
} | void> {
	const envLoader = await loadModule(config.loaders.env);
	const iocBindingLoader = await loadModule(config.loaders.ioc);
	const env = IocContainer.container.get(Env);
	env.process(envLoader);
	iocBindingLoader(IocContainer.container);

	if (config.entrypoint) {
		const entrypoint = await loadModule(config.entrypoint);
		entrypoint();
	}

	if (config.adapters?.server) {
		const server = await config.adapters?.server.provider();
		console.log(server);
		return server.HonoFactory.listen(config.adapters?.server.port, IocContainer.container);
	}
}
