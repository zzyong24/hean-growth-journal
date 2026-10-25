import {register} from '@listenai/agent-sdk';
import {createOfficialVoiceAgent} from './vendor/createOfficialVoiceAgent';
import {HeanTools} from './heanTools';
import {LazyResponseProvider} from './lazyResponse';

// Keep the official ASR/TTS, interruption, history and configuration lifecycle.
// Care requests go through the paired Hean model endpoint configured on the app.
register(createOfficialVoiceAgent({toolProvider:new HeanTools(),responsePipeline:new LazyResponseProvider()}));
