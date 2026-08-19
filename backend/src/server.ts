import { createApp } from "./app";
import { encodeHTML } from "./library";

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`Encode HTML: ${JSON.stringify(encodeHTML([]))}`);
  console.log(`Example app listening at http://localhost:${port}`);
});
