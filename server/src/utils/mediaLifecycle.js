const shouldCleanupUploadedMedia = ({ uploadedKey = "", persisted = false } = {}) =>
  Boolean(uploadedKey && !persisted);

const shouldDeleteReplacedMedia = ({ previousKey = "", nextKey = "", persisted = false } = {}) =>
  Boolean(persisted && previousKey && previousKey !== nextKey);

module.exports = { shouldCleanupUploadedMedia, shouldDeleteReplacedMedia };
