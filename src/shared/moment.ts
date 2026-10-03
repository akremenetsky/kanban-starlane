// Obsidian's bundled moment. obsidian.d.ts types it as `typeof import * as Moment from 'moment'`,
// which is not callable once `esModuleInterop` is on (the TypeScript 6 default, and what the
// review scanner type-checks with), so every moment() call becomes an `error` typed value there.
// The default import's type is the callable function under any setting. The rest of the code
// imports moment from here; `obsidian` exports the same object at runtime. The `moment` package
// comes with `obsidian` (its typings import it); the scanner bans declaring it as a dependency.
import type momentLib from 'moment';
import { moment as obsidianMoment } from 'obsidian';

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- a no-op only while esModuleInterop is off
export const moment = obsidianMoment as unknown as typeof momentLib;

export type Moment = momentLib.Moment;
export type TimeUnit = momentLib.unitOfTime.StartOf;
