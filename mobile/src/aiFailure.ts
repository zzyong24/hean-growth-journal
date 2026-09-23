export function aiFailure(error:unknown,language:string):string {
 const code=error instanceof Error?error.message:'';
 const zh=language==='zh';
 if(code==='AI_PROVIDERS_UNAVAILABLE')return zh?'AI 服务暂时未能响应，备用模型也未返回。你的消息已保留，请稍后重试。':'The AI service and fallback did not respond. Your message is kept; please retry later.';
 if(code==='AI_REQUEST_TIMEOUT'||code==='PROVIDER_TIMEOUT')return zh?'这次处理超时，已停止等待。你的消息已保留，可以重试。':'This request timed out. Your message is kept; you can retry.';
 if(code==='UNAUTHORIZED')return zh?'服务连接凭证已失效。你的消息已保留，请重新连接后重试。':'The service session expired. Your message is kept; reconnect and retry.';
 if(error instanceof TypeError)return zh?'未能连接 AI 服务。你的消息已保留，请检查网络后重试。':'Could not connect to AI. Your message is kept; check your connection and retry.';
 return zh?'这次回复未完成。你的消息已保留，请重试。':'The reply did not complete. Your message is kept; please retry.';
}
