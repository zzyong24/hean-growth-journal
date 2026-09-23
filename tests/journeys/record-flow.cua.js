// Replay in the documented persistent CUA session with an appTab at localhost:8081.
// This is an interactive browser journey, not a headless shell test or a fixture.
await appTab.playwright.getByRole('textbox').fill('喝了90毫升，换了尿布');
await appTab.playwright.getByRole('button',{name:'发送',exact:true}).click();
nodeRepl.write(await appTab.playwright.domSnapshot());
await appTab.playwright.getByRole('textbox').fill('改成60毫升');
await appTab.playwright.getByRole('button',{name:'发送',exact:true}).click();
await appTab.playwright.getByRole('button',{name:'确认保存 · 2',exact:true}).click();
await appTab.playwright.getByRole('tab',{name:'记录',exact:true}).click();
nodeRepl.write(await appTab.playwright.domSnapshot());
await appTab.goto('http://localhost:8081');
nodeRepl.write(await appTab.playwright.domSnapshot());
