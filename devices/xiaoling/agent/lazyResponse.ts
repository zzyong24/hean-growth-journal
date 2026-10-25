import {DefaultResponsePipelineProvider, type ResponsePipeline, type ResponsePipelineProvider} from './vendor/response/deviceResponsePipeline';

// The device gives an empty TTS URL only about five seconds to produce audio.
// Official write()/handleEvent() already open streams on first text. Defer the
// eager start requested before context preparation and the model request.
export class LazyResponseProvider implements ResponsePipelineProvider {
 constructor(private readonly base:ResponsePipelineProvider=new DefaultResponsePipelineProvider()) {}
 create(sessionId:string):ResponsePipeline {
  const response=this.base.create(sessionId);
  return {
   get finalAnswer(){return response.finalAnswer;},
   get ignoreSession(){return response.ignoreSession;},
   get endSession(){return response.endSession;},
   get imageArtifacts(){return response.imageArtifacts;},
   get outputMeta(){return response.outputMeta;},
   get hasActivity(){return response.hasActivity;},
   start(){},
   write(text){response.write(text);},
   handleEvent(event){response.handleEvent(event);},
   emitFrames(frames){response.emitFrames(frames);},
   flush(){response.flush();},
   discardPending(){response.discardPending();},
   abort(emitFinish){response.abort(emitFinish);},
   finish(frames){response.finish(frames);},
  };
 }
}
