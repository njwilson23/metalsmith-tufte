debug = require ('debug')('metalsmith-tufte');

// Expose `plugin`.
module.exports = plugin;

// allOffsets returns an array of objects
// {
//  i: <number>
//  s: <string>
// }
// containing the offset and matching substring for all matches of a symbol.
const allOffsets = (content, sym) => {
  let offsets = Array(),
      re = RegExp(sym, 'g');

  while (true) {
    let m = re.exec(content);
    if (m === null) {
      break
    }
    offsets.push({i: m.index, s: m[0]});
  }
  return offsets;
}

// findClose returns the bracket matching the first in an array. Example: for
// the partially nested set of brackets:
//
//    [(, (, ), ), ), )]
//
// the result is the fourth item.
const findClose = (brackets, depth = 0) => {
  return (brackets.length === 0) ? null :
  (brackets[0].open)      ? findClose(brackets.slice(1), depth + 1) :
  (depth === 1)           ? brackets[0] :
                            findClose(brackets.slice(1), depth - 1)
}


// findTag returns the first tag object
// {
//  tag: <string>,
//  start: <number>,
//  end: <number>,
//  content: <string>,
//  err: <string>,
// }
// of type 'label' in a string. It returns null if no tag is found. If 'err' is defined,
// it describes a parsing error.
const findTag = (content, label) => {
  let opening = allOffsets(content, '{{[a-z]+?:'),
      closing = allOffsets(content, ':}}'),
      brackets = opening.map((obj) => Object.assign({open: true}, obj)).concat(
                  closing.map((obj) => Object.assign({open: false}, obj))
      );
  brackets.sort((a, b) => (a.i < b.i) ? -1 : (a.i > b.i) ? 1 : 0);

  let openIdx = brackets.map((b) => b.s.slice(2, b.s.length-1)).indexOf(label);
  if (openIdx === -1) {
    return null;
  }
  let open = brackets[openIdx];
  let close = findClose(brackets.slice(openIdx));
  if (close === null) {
    return {err: 'closing token not found'};
  }
  return {
      tag: label,
      start: open.i,
      end: close.i + 3,
      content: content.slice(open.i + label.length + 3, close.i),
    };
}

const insertSideNote = (tag, content) =>
  content.slice(0, tag.start) +
    `<label for="sn_${tag.start}" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sn_${tag.start}" class="margin-toggle" /><span class="sidenote">${tag.content}</span>` +
    content.slice(tag.end);

const insertMarginNote = (tag, content) =>
  content.slice(0, tag.start) +
    `<label for="mn_${tag.start}" class="margin-toggle">&#8853;</label><input type="checkbox" id="mn_${tag.start}" class="margin-toggle" /><span class="marginnote">${tag.content}</span>` +
    content.slice(tag.end);

function plugin() {

  return function (files, metalsmith, done) {
    setImmediate(done);
    Object.keys(files).forEach(function(file) {
      let pageData = files[file],
          contentString = pageData.contents.toString();

      while (true) {
        let snTag = findTag(contentString, 'sn');
        if (snTag === null) break
        if (snTag.err) {
          debug(`${snTag.err} in ${file}`)
          break
        }
        contentString = insertSideNote(snTag, contentString);
      }

      while (true) {
        let mnTag = findTag(contentString, 'mn');
        if (mnTag === null) break
        if (mnTag.err) {
          debug(`${mnTag.err} in ${file}`)
          break
        }
        contentString = insertMarginNote(mnTag, contentString);
      }

      pageData.contents = Buffer.from(contentString);
    });
  };
}
