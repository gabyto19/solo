import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { injectSpeedInsights } from '@vercel/speed-insights';

import { AppModule } from './app/app.module';

injectSpeedInsights();

platformBrowserDynamic().bootstrapModule(AppModule, {
  ngZoneEventCoalescing: true
})
  .catch(err => console.error(err));
