import type { SPFI } from '../sp';
import type { ISiteInfo } from '../setup/problems';

export interface IKaizenIdeasProps {
  sp: SPFI;
  site: ISiteInfo;
  /** True where SharePoint leaves no margin round the web part, like a full-page app or a full-width section. */
  padded?: boolean;
}
