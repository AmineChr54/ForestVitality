import { Suspense } from 'react';
import { PageLoader } from './PageLoader';

// Wrap lazy components with Suspense
export const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType>) => (
    <Suspense fallback={<PageLoader />}>
        <Component />
    </Suspense>
);
