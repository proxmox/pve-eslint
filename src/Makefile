eslint: app.js eslint.js
	echo "#!/usr/bin/env node" >$@.tmp
	cat eslint.js >>$@.tmp
	cat app.js >>$@.tmp
	mv $@.tmp $@

install: eslint
	install -D -m 0755 $< ${DESTDIR}/usr/bin/$<

.PHONY: distclean
distclean: clean

.PHONY: clean
clean:
	rm -rf *~ eslint eslint.tmp
