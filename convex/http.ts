import { httpRouter } from 'convex/server';

import { httpAction } from './_generated/server';
import { auth } from './auth';
import {
  handleAssetPublishingProofCheckpoint,
  handleAssetPublishingProofEligibility,
} from './lib/assetPublishingProof';

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: '/asset-publishing/proof/checkpoint',
  method: 'POST',
  handler: httpAction(async (_ctx, request) => {
    return await handleAssetPublishingProofCheckpoint(request, {
      expectedSecret: process.env.ASSET_PUBLISHING_PROOF_SECRET,
    });
  }),
});

http.route({
  path: '/asset-publishing/proof/eligibility',
  method: 'POST',
  handler: httpAction(async (_ctx, request) => {
    return await handleAssetPublishingProofEligibility(request, {
      expectedSecret: process.env.ASSET_PUBLISHING_PROOF_SECRET,
      eligibility:
        process.env.ASSET_PUBLISHING_PROOF_ELIGIBILITY === 'eligible' ? 'eligible' : 'empty',
    });
  }),
});

export default http;
