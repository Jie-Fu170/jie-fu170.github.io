document.addEventListener('DOMContentLoaded', () => {
    const channelListContainer = document.getElementById('channel-list');
    const videoPlayer = document.getElementById('video-player');

    // Function to parse the M3U file content
    function parseM3U(data) {
        const lines = data.trim().split('\n');
        const channelsByGroup = {};
        let currentChannelInfo = {};

        for (const line of lines) {
            if (line.startsWith('#EXTINF:')) {
                const infoMatch = line.match(/group-title="([^"]+)"/);
                const nameMatch = line.split(',').pop();

                const groupTitle = infoMatch ? infoMatch[1] : '其他';
                const name = nameMatch || '未知频道';

                currentChannelInfo = { name, group: groupTitle };

                const logoMatch = line.match(/tvg-logo="([^"]+)"/);
                if (logoMatch) {
                    currentChannelInfo.logo = logoMatch[1];
                }
            } else if (line.trim() && !line.startsWith('#')) {
                currentChannelInfo.url = line.trim();
                if (!channelsByGroup[currentChannelInfo.group]) {
                    channelsByGroup[currentChannelInfo.group] = [];
                }
                channelsByGroup[currentChannelInfo.group].push(currentChannelInfo);
                currentChannelInfo = {}; // Reset
            }
        }
        return channelsByGroup;
    }

    // Function to render the channel list
    function renderChannelList(channelsByGroup) {
        const placeholder = channelListContainer.querySelector('p');
        if(placeholder) placeholder.remove();

        const accordion = document.createElement('div');
        accordion.className = 'accordion';
        accordion.id = 'channelAccordion';

        let groupIndex = 0;
        for (const group in channelsByGroup) {
            const channels = channelsByGroup[group];
            const accordionId = `accordion-${groupIndex}`;

            const item = document.createElement('div');
            item.className = 'accordion-item';

            const header = document.createElement('h2');
            header.className = 'accordion-header';
            header.innerHTML = `
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${accordionId}" aria-expanded="false" aria-controls="${accordionId}">
                    ${group}
                </button>
            `;

            const collapse = document.createElement('div');
            collapse.id = accordionId;
            collapse.className = 'accordion-collapse collapse';
            collapse.setAttribute('data-bs-parent', '#channelAccordion');

            const body = document.createElement('div');
            body.className = 'accordion-body p-0';

            const list = document.createElement('ul');
            list.className = 'list-group list-group-flush';

            channels.forEach(channel => {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item list-group-item-action';
                listItem.style.cursor = 'pointer';
                listItem.dataset.url = channel.url;
                listItem.innerHTML = `
                    ${channel.logo ? `<img src="${channel.logo}" alt="" width="24" height="24" class="me-2 align-middle">` : ''}
                    <span class="align-middle">${channel.name}</span>
                `;
                list.appendChild(listItem);
            });

            body.appendChild(list);
            collapse.appendChild(body);
            item.appendChild(header);
            item.appendChild(collapse);
            accordion.appendChild(item);

            groupIndex++;
        }

        channelListContainer.appendChild(accordion);
    }

    let hls; // Keep a single HLS instance

    // Function to play a video stream
    function playVideo(url) {
        if (hls) {
            hls.destroy();
        }
        if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoPlayer.play().catch(e => console.error("Autoplay was prevented.", e));
            });
            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    console.error('HLS fatal error:', data);
                }
            });
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = url;
            videoPlayer.play().catch(e => console.error("Autoplay was prevented.", e));
        }
    }

    // Function to set up click listeners on the channel list
    function setupClickHandlers() {
        channelListContainer.addEventListener('click', (event) => {
            const target = event.target.closest('li.list-group-item-action');
            if (target) {
                const url = target.dataset.url;
                if (url) {
                    playVideo(url);
                    // Highlight the active channel
                    document.querySelectorAll('li.list-group-item-action').forEach(item => {
                        item.classList.remove('active');
                    });
                    target.classList.add('active');
                }
            }
        });
    }

    // Fetch, parse, and render
    fetch('demo.m3u')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.text();
        })
        .then(data => {
            const channels = parseM3U(data);
            renderChannelList(channels);
            setupClickHandlers(); // Set up listeners after rendering
        })
        .catch(error => {
            console.error('Failed to load channel list:', error);
            channelListContainer.innerHTML = '<div class="alert alert-danger">加载频道列表失败。</div>';
        });
});
