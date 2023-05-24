include /usr/share/dpkg/pkg-info.mk

PACKAGE=pve-eslint

GITVERSION:=$(shell git rev-parse HEAD)
BUILDDIR ?= $(PACKAGE)-$(DEB_VERSION_UPSTREAM)

DEB=$(PACKAGE)_$(DEB_VERSION_UPSTREAM_REVISION)_all.deb
DSC=$(PACKAGE)_$(DEB_VERSION_UPSTREAM_REVISION).dsc

SRCDIR=src
UPSTREAM=eslint
UPSTREAMTAG=v8.41.0
UPSTREAMSRC=$(UPSTREAM)-$(UPSTREAMTAG)

all: $(DEB)
	@echo $(DEB)

.PHONY: dsc deb builddir

$(BUILDDIR): builddir
builddir: $(SRCDIR)
	rm -rf $(BUILDDIR).tmp $(BUILDDIR)
	mkdir $(BUILDDIR).tmp
	cp -a debian $(BUILDDIR).tmp/
	cp -a $(SRCDIR)/* $(BUILDDIR).tmp/
	echo "git clone git://git.proxmox.com/git/pve-eslint.git\\ngit checkout $(GITVERSION)" > $(BUILDDIR).tmp/debian/SOURCE
	mv $(BUILDDIR).tmp $(BUILDDIR)


dsc: $(DSC)
$(DSC): builddir
	cd $(BUILDDIR); dpkg-buildpackage -S -uc -us
	lintian $(DSC)

deb: $(DEB)
$(DEB): builddir
	cd $(BUILDDIR); dpkg-buildpackage -b -uc -us
	lintian $(DEB)
	@echo $(DEB)

.PHONY: download
download:
	rm -rf $(UPSTREAM)
	$(MAKE) $(UPSTREAM)

$(UPSTREAM):
	rm -rf $(UPSTREAM).tmp $(UPSTREAM)
	git clone -b $(UPSTREAMTAG) --depth 1 https://github.com/eslint/eslint $(UPSTREAM).tmp
	rm -rf $(UPSTREAM).tmp/.git
	find $(UPSTREAM).tmp/ -type f -name '.gitignore' -delete
	mv $(UPSTREAM).tmp $(UPSTREAM)

.PHONY: vendor-upstream
vendor-upstream:
	rm -rf $(UPSTREAMSRC) src/lib/eslint.js
	$(MAKE) src/lib/eslint.js

src/lib/eslint.js: $(UPSTREAMSRC)/build/eslint.js
	cp $(UPSTREAMSRC)/build/eslint.js src/lib/eslint.js

$(UPSTREAMSRC)/build/eslint.js: $(UPSTREAMSRC)
# NOTE: needs npm installed, downloads packages from npm
	cd $(UPSTREAMSRC); npm install
	cd $(UPSTREAMSRC); npm run build:webpack

$(UPSTREAMSRC): $(UPSTREAM) patches
	rm -rf $@ $@.tmp
	mkdir $@.tmp
	rsync -ra $(UPSTREAM)/ $@.tmp
	cd $@.tmp; ln -s ../patches patches
	cd $@.tmp; quilt push -a
	cd $@.tmp; rm -rf .pc ./patches
	mv $@.tmp $@

.PHONY: upload
upload: UPLOAD_DIST ?= $(DEB_DISTRIBUTION)
upload: $(DEB)
	tar cf - $(DEB) | ssh -X repoman@repo.proxmox.com -- upload --product devel --dist $(UPLOAD_DIST)

.PHONY: distclean
distclean: clean

.PHONY: clean
clean:
	rm -rf *~ debian/*~ *.deb $(BUILDSRC) *.tmp/ $(BUILDDIR) *.changes *.tar.gz *.dsc *.buildinfo

.PHONY: dinstall
dinstall: deb
	dpkg -i $(DEB)
