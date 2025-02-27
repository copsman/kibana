/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { APIClientRequestParamsOf } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../common/ftr_provider_context';

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const spaces = getService('spaces');
  const es = getService('es');
  const log = getService('log');

  const start = encodeURIComponent(new Date(Date.now() - 10000).toISOString());
  const end = encodeURIComponent(new Date().toISOString());

  const expect403 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response.statusCode).to.be(403);
  };

  const expect200 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response.statusCode).to.be(200);
  };

  interface Endpoint {
    req: {
      url: string;
      method?: 'get' | 'post' | 'delete' | 'put';
      body?: any;
    };
    expectForbidden: (result: any) => void;
    expectResponse: (result: any) => void;
    onExpectationFail?: () => Promise<any>;
  }

  function createAgent(
    body: APIClientRequestParamsOf<'PUT /api/apm/settings/agent-configuration 2023-05-22'>['params']['body']
  ) {
    return apmApiClient.writeUser({
      endpoint: 'PUT /api/apm/settings/agent-configuration 2023-05-22',
      params: {
        body,
      },
    });
  }

  function deleteAgent(
    body: APIClientRequestParamsOf<'DELETE /api/apm/settings/agent-configuration 2023-05-22'>['params']['body']
  ) {
    return apmApiClient.writeUser({
      endpoint: 'DELETE /api/apm/settings/agent-configuration 2023-05-22',
      params: {
        body,
      },
    });
  }

  const endpoints: Endpoint[] = [
    {
      // this doubles as a smoke test for the _inspect query parameter
      req: {
        url: `/internal/apm/services/foo/errors/groups/main_statistics?start=${start}&end=${end}&_inspect=true&environment=ENVIRONMENT_ALL&kuery=`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/services/foo/errors/bar/samples?start=${start}&end=${end}&environment=ENVIRONMENT_ALL&kuery=`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/services/foo/errors/distribution?start=${start}&end=${end}&groupId=bar&environment=ENVIRONMENT_ALL&kuery=`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/services/foo/errors/distribution?start=${start}&end=${end}&environment=ENVIRONMENT_ALL&kuery=`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/services/foo/metrics/charts?start=${start}&end=${end}&agentName=cool-agent&environment=ENVIRONMENT_ALL&kuery=`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/services?start=${start}&end=${end}&environment=ENVIRONMENT_ALL&kuery=&probability=1&documentType=transactionMetric&rollupInterval=1m`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/services/foo/agent?start=${start}&end=${end}`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: { url: `/internal/apm/services/foo/transaction_types?start=${start}&end=${end}` },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/traces?start=${start}&end=${end}&environment=ENVIRONMENT_ALL&kuery=&probability=1`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/traces/foo?start=${start}&end=${end}&entryTransactionId=foo`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/services/foo/transactions/charts/latency?environment=testing&start=${start}&end=${end}&transactionType=bar&latencyAggregationType=avg&kuery=&documentType=transactionMetric&rollupInterval=1m&bucketSizeInSeconds=60`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/services/foo/transactions/charts/latency?environment=testing&start=${start}&end=${end}&transactionType=bar&latencyAggregationType=avg&transactionName=baz&kuery=&documentType=transactionMetric&rollupInterval=1m&bucketSizeInSeconds=60`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/services/foo/transactions/traces/samples?start=${start}&end=${end}&transactionType=bar&transactionName=baz&environment=ENVIRONMENT_ALL&kuery=`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        method: 'post',
        url: `/api/apm/settings/agent-configuration/search`,
        body: { service: { name: 'test-service' }, etag: 'abc' },
      },
      expectForbidden: expect403,
      expectResponse: expect200,
      onExpectationFail: async () => {
        const res = await es.search({
          index: '.apm-agent-configuration',
        });

        log.error(JSON.stringify(res, null, 2));
      },
    },
    {
      req: {
        url: `/internal/apm/settings/custom_links/transaction`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/services/foo/metadata/details?start=${start}&end=${end}`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/internal/apm/services/foo/metadata/icons?start=${start}&end=${end}`,
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
  ];

  const elasticsearchPrivileges = {
    indices: [
      { names: ['apm-*'], privileges: ['read', 'view_index_metadata'] },
      { names: ['.apm-agent-configuration'], privileges: ['read', 'write', 'view_index_metadata'] },
      { names: ['.apm-custom-link'], privileges: ['read', 'write', 'view_index_metadata'] },
    ],
  };

  async function executeAsUser(
    { method = 'get', url, body }: Endpoint['req'],
    username: string,
    password: string,
    spaceId?: string
  ) {
    const basePath = spaceId ? `/s/${spaceId}` : '';

    let request = supertestWithoutAuth[method](`${basePath}${url}`);

    // json body
    if (body) {
      request = request.send(body);
    }

    return await request
      .auth(username, password)
      .set('kbn-xsrf', 'foo')
      .then((response: any) => ({ error: undefined, response }))
      .catch((error: any) => ({ error, response: undefined }));
  }

  async function executeRequests({
    username,
    password,
    expectation,
    spaceId,
  }: {
    username: string;
    password: string;
    expectation: 'forbidden' | 'response';
    spaceId?: string;
  }) {
    for (const endpoint of endpoints) {
      log.info(`Requesting: ${endpoint.req.url}. Expecting: ${expectation}`);
      const result = await executeAsUser(endpoint.req, username, password, spaceId);
      log.info(`Responded: ${endpoint.req.url}`);

      try {
        if (expectation === 'forbidden') {
          endpoint.expectForbidden(result);
        } else {
          endpoint.expectResponse(result);
        }
      } catch (e) {
        if (endpoint.onExpectationFail) {
          await endpoint.onExpectationFail();
        }

        const { statusCode, body, req } = result.response;
        throw new Error(
          `Endpoint: ${req.method} ${req.path}
          Status code: ${statusCode}
          Response: ${body.message}

          ${e.message}`
        );
      }
    }
  }

  registry.when('apm feature controls', { config: 'basic', archives: [] }, () => {
    const config = {
      service: { name: 'test-service' },
      settings: { transaction_sample_rate: '0.5' },
    };
    before(async () => {
      log.info(`Creating agent configuration`);
      await createAgent(config);
      log.info(`Agent configuration created`);
    });

    after(async () => {
      log.info('deleting agent configuration');
      await deleteAgent({ service: config.service });
      log.info('Agent configuration deleted');
    });

    it(`APIs can't be accessed by logstash_read user`, async () => {
      const username = 'logstash_read';
      const roleName = 'logstash_read';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: elasticsearchPrivileges,
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await executeRequests({ username, password, expectation: 'forbidden' });
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    it('APIs can be accessed by global_all user', async () => {
      const username = 'global_all';
      const roleName = 'global_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: elasticsearchPrivileges,
          kibana: [{ base: ['all'], spaces: ['*'] }],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await executeRequests({ username, password, expectation: 'response' });
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    // this could be any role which doesn't have access to the APM feature
    it(`APIs can't be accessed by dashboard_all user`, async () => {
      const username = 'dashboard_all';
      const roleName = 'dashboard_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: elasticsearchPrivileges,
          kibana: [{ feature: { dashboard: ['all'] }, spaces: ['*'] }],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await executeRequests({ username, password, expectation: 'forbidden' });
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    describe('spaces', () => {
      // the following tests create a user_1 which has uptime read access to space_1 and dashboard all access to space_2
      const space1Id = 'space_1';
      const space2Id = 'space_2';

      const roleName = 'user_1';
      const username = 'user_1';
      const password = 'user_1-password';

      before(async () => {
        await spaces.create({
          id: space1Id,
          name: space1Id,
          disabledFeatures: [],
        });
        await spaces.create({
          id: space2Id,
          name: space2Id,
          disabledFeatures: [],
        });
        await security.role.create(roleName, {
          elasticsearch: elasticsearchPrivileges,
          kibana: [
            { feature: { apm: ['read'] }, spaces: [space1Id] },
            { feature: { dashboard: ['all'] }, spaces: [space2Id] },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
        });
      });

      after(async () => {
        await spaces.delete(space1Id);
        await spaces.delete(space2Id);
        await security.role.delete(roleName);
        await security.user.delete(username);
      });

      it('user_1 can access APIs in space_1', async () => {
        await executeRequests({ username, password, expectation: 'response', spaceId: space1Id });
      });

      it(`user_1 can't access APIs in space_2`, async () => {
        await executeRequests({ username, password, expectation: 'forbidden', spaceId: space2Id });
      });
    });
  });
}
