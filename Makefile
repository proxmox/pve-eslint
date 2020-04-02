include /usr/share/dpkg/pkg-info.mk

PACKAGE=pve-eslint

GITVERSION:=$(shell git rev-parse HEAD)
BUILDDIR ?= ${PACKAGE}-${DEB_VERSION_UPSTREAM}

DEB=${PACKAGE}_${DEB_VERSION_UPSTREAM_REVISION}_all.deb

SRCDIR=src
UPSTREAM=eslint
UPSTREAMTAG=v7.0.0-alpha.3
BUILDSRC=${UPSTREAM}-${UPSTREAMTAG}

all: ${DEB}
	@echo ${DEB}

.PHONY: deb
deb: ${DEB}
${DEB}: ${SRCDIR}
	rm -rf ${BUILDDIR}
	mkdir ${BUILDDIR}
	cp -a debian ${BUILDDIR}/
	cp -a ${SRCDIR}/* ${BUILDDIR}/
	echo "git clone git://git.proxmox.com/git/pve-eslint.git\\ngit checkout ${GITVERSION}" > ${BUILDDIR}/debian/SOURCE
	cd ${BUILDDIR}; dpkg-buildpackage -rfakeroot -b -uc -us
	lintian ${DEB}
	@echo ${DEB}

.PHONY: download
download:
	rm -rf ${UPSTREAM}.tmp ${UPSTREAM}
	git clone -b ${UPSTREAMTAG} --depth 1 https://github.com/eslint/eslint ${UPSTREAM}.tmp
	rm -rf ${UPSTREAM}.tmp/.git
	find ${UPSTREAM}.tmp/ -type f -name '.gitignore' -delete
	mv ${UPSTREAM}.tmp ${UPSTREAM}

# NOTE: needs npm installed, downloads packages from npm
.PHONY: buildupstream
buildupstream: ${BUILDSRC}
	cp ${BUILDSRC}/build/eslint.js ${SRCDIR}/eslint.js

${BUILDSRC}: ${UPSTREAM} patches
	rm -rf $@
	mkdir $@.tmp
	rsync -ra ${UPSTREAM}/ $@.tmp
	cd $@.tmp; ln -s ../patches patches
	cd $@.tmp; quilt push -a
	cd $@.tmp; rm -rf .pc ./patches
	mv $@.tmp $@
	cd $@; npm install
	cd $@; npm run webpack

.PHONY: upload
upload: ${DEB}
	tar cf - ${DEB} | ssh -X repoman@repo.proxmox.com -- upload --product pmg,pve --dist buster

.PHONY: distclean
distclean: clean

.PHONY: clean
clean:
	rm -rf *~ debian/*~ *.deb ${BUILDSRC} ${BUILDSRC}.tmp ${UPSTREAM}.tmp ${BUILDDIR} *.changes *.dsc *.buildinfo

.PHONY: dinstall
dinstall: deb
	dpkg -i ${DEB}
