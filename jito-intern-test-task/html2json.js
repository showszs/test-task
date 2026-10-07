function convertHtml2JsonAndSet() {
  const htmlTextAreaValue = document.getElementById("html").value;
  const jsonArea = document.getElementById("json");
  jsonArea.value = html2json(htmlTextAreaValue);
}

async function loadHtmlSample(fileName) {
  const htmlTextArea = document.getElementById("html");
  try {
    const response = await fetch(`html_samples/${fileName}`);
    if (!response.ok) {
      throw new Error(`Unable to load ${fileName}: ${response.status}`);
    }
    htmlTextArea.value = await response.text();
    document.getElementById("json").value = "";
  } catch (error) {
    htmlTextArea.value = `Sample loading failed: ${error.message}`;
  }
}

function showSample1() {
  return loadHtmlSample("sample1_complex_valid.html");
}

function showSample2() {
  return loadHtmlSample("sample2_malformed_edge_cases.html");
}

function showSample3() {
  return loadHtmlSample("sample3_large_document.html");
}

function html2json(html) {
  const voidTags = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ]);
  const rawTextTags = new Set(["script", "style"]);
  const root = [];
  const stack = [{ tag: null, children: root }];

  try {
    if (typeof html !== "string" || html.length === 0) {
      return "[]";
    }

    const appendText = (value) => {
      const content = value.trim();
      if (content) {
        stack[stack.length - 1].children.push({ type: "text", content });
      }
    };

    const findTagEnd = (start) => {
      let quote = null;
      for (let index = start; index < html.length; index += 1) {
        const character = html[index];
        if (quote) {
          if (character === quote) quote = null;
        } else if (character === "\"" || character === "'") {
          quote = character;
        } else if (character === ">") {
          return index;
        }
      }
      return -1;
    };

    const parseAttributes = (source) => {
      const attributes = {};
      const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
      let match;
      while ((match = attributePattern.exec(source)) !== null) {
        const name = match[1];
        if (!name || name === "/") continue;
        attributes[name] = match[2] ?? match[3] ?? match[4] ?? true;
      }
      return attributes;
    };

    let cursor = 0;
    while (cursor < html.length) {
      const current = stack[stack.length - 1];
      if (current.tag && rawTextTags.has(current.tag)) {
        const closingPattern = new RegExp(`</\\s*${current.tag}\\s*>`, "i");
        const closingMatch = closingPattern.exec(html.slice(cursor));
        if (!closingMatch) {
          appendText(html.slice(cursor));
          break;
        }
        appendText(html.slice(cursor, cursor + closingMatch.index));
        stack.pop();
        cursor += closingMatch.index + closingMatch[0].length;
        continue;
      }

      const nextTag = html.indexOf("<", cursor);
      if (nextTag === -1) {
        appendText(html.slice(cursor));
        break;
      }
      if (nextTag > cursor) {
        appendText(html.slice(cursor, nextTag));
        cursor = nextTag;
        continue;
      }

      if (html.startsWith("<!--", cursor)) {
        const commentEnd = html.indexOf("-->", cursor + 4);
        cursor = commentEnd === -1 ? html.length : commentEnd + 3;
        continue;
      }
      if (/^<!\[CDATA\[/i.test(html.slice(cursor))) {
        const cdataEnd = html.indexOf("]]>", cursor + 9);
        cursor = cdataEnd === -1 ? html.length : cdataEnd + 3;
        continue;
      }
      if (/^<!DOCTYPE\b/i.test(html.slice(cursor))) {
        const doctypeEnd = findTagEnd(cursor + 2);
        cursor = doctypeEnd === -1 ? html.length : doctypeEnd + 1;
        continue;
      }

      const tagEnd = findTagEnd(cursor + 1);
      if (tagEnd === -1) {
        appendText(html.slice(cursor));
        break;
      }
      const token = html.slice(cursor, tagEnd + 1);
      const closing = token.match(/^<\s*\/\s*([A-Za-z][\w:.-]*)[^>]*>$/);
      if (closing) {
        const tag = closing[1].toLowerCase();
        let matchingIndex = -1;
        for (let index = stack.length - 1; index > 0; index -= 1) {
          if (stack[index].tag === tag) {
            matchingIndex = index;
            break;
          }
        }
        if (matchingIndex !== -1) stack.length = matchingIndex;
        cursor = tagEnd + 1;
        continue;
      }

      const opening = token.match(/^<\s*([A-Za-z][\w:.-]*)([\s\S]*?)>$/);
      if (!opening) {
        appendText(token);
        cursor = tagEnd + 1;
        continue;
      }
      const tag = opening[1].toLowerCase();
      const attributeSource = opening[2].replace(/\/\s*$/, "");
      const node = { tag, attributes: parseAttributes(attributeSource), children: [] };
      stack[stack.length - 1].children.push(node);
      const selfClosing = /\/\s*>$/.test(token) || voidTags.has(tag);
      if (!selfClosing) stack.push(node);
      cursor = tagEnd + 1;
    }

    return JSON.stringify(root, null, 2);
  } catch (error) {
    return "[]";
  }
}

function showExample1() {
  const htmlExample = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport">
    <title>Sample HTML</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Welcome to My Website</h1>
    </header>
    <nav>
        <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
    </nav>
    <main>
        <section id="home">
            <h2>Home Section</h2>
            <p>This is the home section of the webpage.</p>
        </section>
        <section id="about">
            <h2>About Section</h2>
            <p>This is the about section of the webpage.</p>
        </section>
    </main>
    <footer>
        <p>&copy; 2024 My Website</p>
    </footer>
    <script src="script.js"></script>
</body>
</html>
`;
  const jsonContent = {
    "Comment 1":
      "You have to think about how to take into account various html inputs so your json structure will cover them all and handle different cases.",
    "Comment 2":
      "When you make any choice in terms of selecting specific json structure for conversion - be ready to provide reasoning behind such choice.",
  };

  document.getElementById("html").value = htmlExample;
  document.getElementById("json").value = JSON.stringify(
    jsonContent,
    null,
    2
  );
}

function showExample2() {
  const htmlExample = `<div>
<p>Hello world!</p>
  <button>Click me!</button>
  <textarea>Some very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very long string.</textarea>
</div>
`;
  const jsonContent = {
    "Comment 1":
      "You have to think about how to take into account various html inputs so your json structure will cover them all and handle different cases.",
    "Comment 2":
      "When you make any choice in terms of selecting specific json structure for conversion - be ready to provide reasoning behind such choice.",
  };

  document.getElementById("html").value = htmlExample;
  document.getElementById("json").value = JSON.stringify(
    jsonContent,
    null,
    2
  );
}
