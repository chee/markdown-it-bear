let MARKER_CHAR_CODE = ":".charCodeAt(0)

module.exports = md => {
	function tokenize(state, silent) {
		var i, scanned, token, len, ch,
		start = state.pos,
		marker = state.src.charCodeAt(start);

		if (silent) { return false; }

		if (marker !== MARKER_CHAR_CODE) { return false; }

		scanned = state.scanDelims(state.pos, true);
		len = scanned.length;
		ch = String.fromCharCode(marker);

		if (len < 2) { return false; }

		if (len % 2) {
			token = state.push('text', '', 0);
			token.content = ch;
			len--;
		}

		for (i = 0; i < len; i += 2) {
			token = state.push('text', '', 0);
			token.content = ch + ch;

			state.delimiters.push({
				marker: marker,
				jump:   i,
				token:  state.tokens.length - 1,
				level:  state.level,
				end:    -1,
				open:   scanned.can_open,
				close:  scanned.can_close
			});
		}

		state.pos += scanned.length;

		return true;
	}


	// Walk through delimiter list and replace text tokens with tags
	function postProcess(state) {
		var i, j,
		startDelim,
		endDelim,
		token,
		loneMarkers = [],
		delimiters = state.delimiters,
		max = state.delimiters.length;

		for (i = 0; i < max; i++) {
			startDelim = delimiters[i];

			if (startDelim.marker !== MARKER_CHAR_CODE) {
				continue;
			}

			if (startDelim.end === -1) {
				continue;
			}

			endDelim = delimiters[startDelim.end];

			token = state.tokens[startDelim.token];
			token.type = 'mark_open';
			token.tag = 'mark';
			token.nesting = 1;
			token.markup = '::';
			token.content = '';

			token = state.tokens[endDelim.token];
			token.type = 'mark_close';
			token.tag = 'mark';
			token.nesting = -1;
			token.markup = '::';
			token.content = '';

			if (state.tokens[endDelim.token - 1].type === 'text' &&
			state.tokens[endDelim.token - 1].content === ':') {

				loneMarkers.push(endDelim.token - 1);
			}
		}

		while (loneMarkers.length) {
			i = loneMarkers.pop();
			j = i + 1;

			while (j < state.tokens.length && state.tokens[j].type === 'mark_close') {
				j++;
			}

			j--;

			if (i !== j) {
				token = state.tokens[j];
				state.tokens[j] = state.tokens[i];
				state.tokens[i] = token;
			}
		}
	}

	md.inline.ruler.before('emphasis', 'mark', tokenize);
	md.inline.ruler2.before('emphasis', 'mark', postProcess);
}
