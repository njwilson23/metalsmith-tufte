// Expose `plugin`.
module.exports = plugin;

function plugin() {

  const sideNoteRegex = /\{\{sn:([\w\W\n]+?)\}\}/g
  const replacer = (match, submatch, offset, fullString) => `<label for="sn_${offset}" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sn_${offset}" class="margin-toggle" /><span class="sidenote">${submatch}</span>`;

  return function (files, metalsmith, done) {
    setImmediate(done);
    Object.keys(files).forEach(function(file) {
      let pageData = files[file],
          newContent = pageData.contents.toString().replace(sideNoteRegex, replacer);
      pageData.contents = Buffer.from(newContent);
    });

  };
}
