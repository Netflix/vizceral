/**
 *
 *  Copyright 2016 Netflix, Inc.
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */
import { each } from 'lodash';

import RendererUtils from './rendererUtils';

const Console = console;

function getNoticeElement () {
  const noticeParentElement = RendererUtils.getParent();
  if (noticeParentElement) {
    const noticeElement = noticeParentElement.querySelector('.vizceral-notice');
    if (!noticeElement) {
      Console.warn('Notices are present on a connection, but there is no sibling element with a class of .vizceral-notice.');
      return undefined;
    }
    return noticeElement;
  }
  return undefined;
}

class Notices {
  showNotices (container, notices) {
    const noticeElement = getNoticeElement();
    if (!noticeElement) { return; }

    const screenPosition = RendererUtils.toScreenPosition(container, 'TL');

    // Clear any old notices
    while (noticeElement.hasChildNodes()) {
      noticeElement.removeChild(noticeElement.lastChild);
    }

    // Create the notices list
    const noticeListElement = document.createElement('ul');

    // Add new notices to the notice box
    each(notices, (notice) => {
      let noticeString = notice.title;
      if (notice.link) {
        noticeString = `<a href="${notice.link}" target="_blank">${noticeString}</a>`;
      }
      if (notice.subtitle) {
        noticeString = `<span class="subtitle vizceral">[${notice.subtitle}]</span> ${noticeString}`;
      }

      const noticeItem = document.createElement('li');
      noticeItem.className = 'vizceral';
      noticeItem.innerHTML = noticeString;

      noticeListElement.appendChild(noticeItem);
    });

    // Size and position the notices
    noticeElement.appendChild(noticeListElement);
    noticeElement.style.display = 'block';
    noticeElement.style.top = `${screenPosition.y - (noticeElement.offsetHeight || 0)}px`;
    noticeElement.style.left = `${screenPosition.x}px`;
  }

  hideNotices () {
    // When using vizceral in a web component, there are cases when the vizceral component does not
    // have a parent yet. Make sure we have a parent before continuing.
    const noticeElement = getNoticeElement();
    if (!noticeElement) { return; }
    noticeElement.style.display = 'none';
  }
}

export default new Notices();
