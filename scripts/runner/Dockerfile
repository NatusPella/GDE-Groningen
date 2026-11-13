# Self-hosted GitHub Actions runner for GDE Groningen builds (Linux, Android, Windows via Wine).
# Mirrors what the release workflows expect from ubuntu-latest: gh, ffmpeg with Opus,
# an Android SDK under $ANDROID_HOME. Node and JDK come from setup-node / setup-java.
# Wine lets electron-builder stamp the icon and version info into the Windows exe.
FROM ghcr.io/actions/actions-runner:2.338.2

USER root

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl git jq unzip zip xz-utils zstd file \
      ffmpeg openjdk-21-jdk-headless squashfs-tools \
      wine wine64 libatomic1 python3 build-essential \
 && mkdir -p -m 755 /etc/apt/keyrings \
 && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \
 && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
 && apt-get update && apt-get install -y --no-install-recommends gh \
 && rm -rf /var/lib/apt/lists/*

# Android command-line tools + the platform/build-tools the workflows ask for.
ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk
ARG CMDLINE_TOOLS=commandlinetools-linux-16111833_latest.zip
ARG CMDLINE_TOOLS_SHA1=e025545c62a8e64c7559119566a569fb1dec5f60
RUN mkdir -p $ANDROID_HOME/cmdline-tools \
 && curl -fsSL -o /tmp/clt.zip https://dl.google.com/android/repository/$CMDLINE_TOOLS \
 && echo "$CMDLINE_TOOLS_SHA1  /tmp/clt.zip" | sha1sum -c - \
 && unzip -q /tmp/clt.zip -d /tmp/clt && mv /tmp/clt/cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
 && rm -rf /tmp/clt /tmp/clt.zip \
 && yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null \
 && $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" > /dev/null \
 && chown -R runner:runner $ANDROID_HOME

COPY entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh
# Named volumes take ownership from the image path on first mount.
RUN mkdir -p /state /home/runner/_work /home/runner/.cache /home/runner/.npm /home/runner/.gradle \
 && chown runner:runner /state /home/runner/_work /home/runner/.cache /home/runner/.npm /home/runner/.gradle

USER runner
ENTRYPOINT ["/entrypoint.sh"]
