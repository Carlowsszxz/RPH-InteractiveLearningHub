        // ==================== AUTHENTICATION CHECK ====================
        // Check if user is logged in via Supabase session
        async function checkAuth() {
            try {
                // If userEmail not in localStorage, user is logged out
                if (!localStorage.getItem('userEmail')) {
                    console.log('No user email in localStorage, redirecting to login');
                    window.location.href = 'index.html';
                    return;
                }

                // Wait longer to ensure Supabase is fully initialized
                await new Promise(resolve => setTimeout(resolve, 500));

                if (!window.supabaseClient) {
                    console.error('Supabase client not initialized, waiting and retrying...');
                    // Wait a bit more and retry once before giving up
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    if (!window.supabaseClient) {
                        console.error('Supabase client still not initialized after retry');
                        window.location.href = 'index.html';
                        return;
                    }
                }

                const { data: { session }, error } = await window.supabaseClient.auth.getSession();

                if (error) {
                    console.error('Error getting session:', error);
                    // Don't redirect on error - could be temporary network issue
                    // Only redirect if we're certain there's no session
                    return;
                }

                if (!session) {
                    console.log('No active session, redirecting to login');
                    window.location.href = 'index.html';
                    return;
                }

                console.log('User authenticated:', session.user.email);
            } catch (error) {
                console.error('Auth check error:', error);
                // Don't redirect on error - it might be a temporary issue
                // Let the user stay on the page
                console.warn('Auth check failed, but allowing page access (might be temporary issue)');
            }
        }

        // Make openTask available globally before TaskManager is defined
        let openTask = (taskId) => {
            if (TaskManager && TaskManager.openTask) {
                TaskManager.openTask(taskId);
            }
        };

        // Task Manager
        const TaskManager = {
            currentTask: null,
            currentScore: 0,
            currentMaxScore: 0,

            tasks: {
                'timeline-cavite': {
                    title: 'Cavite Mutiny Timeline',
                    maxScore: 5,
                    content: `
                        <p style="font-size: 16px; color: #51513E; margin-bottom: 24px; font-weight: 500;"><strong>Arrange these events in the correct chronological order by selecting them:</strong></p>
                        <div style="margin: 20px 0; display: grid; gap: 12px;">
                            <div class="timeline-item" data-order="1" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px; hover-scale: 1.02;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Spanish authorities removed long-enjoyed privileges (like tax exemption and forced labor exemption) of Filipino workers and soldiers in the Cavite arsenal.</span>
                            </div>
                            <div class="timeline-item" data-order="2" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Discontent grew among arsenal workers and troops, leading to plans of protest against the new policies.</span>
                            </div>
                            <div class="timeline-item" data-order="3" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">On January 20, 1872, the mutiny broke out at Fort San Felipe in Cavite, led by Sergeant La Madrid and fellow soldiers.</span>
                            </div>
                            <div class="timeline-item" data-order="4" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">The Spanish government quickly suppressed the uprising and arrested many Filipinos, including priests and suspected reformists.</span>
                            </div>
                            <div class="timeline-item" data-order="5" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Gomburza (Gomez, Burgos, and Zamora) were executed on February 17, 1872, after being accused of involvement, which later fueled Filipino nationalism.</span>
                            </div>
                        </div>
                        <div id="timeline-feedback" style="margin-top: 20px; padding: 16px; border-radius: 8px; display: none; border-left: 4px solid #28a745;"></div>
                    `,
                    check: function() {
                        // Check if items were selected in correct chronological order
                        if (timelineSelectionOrder.length < 5) {
                            return { score: 0, max: 5 };
                        }

                        const selectedOrder = timelineSelectionOrder.map(item => parseInt(item.getAttribute('data-order')));

                        // Verify they're in ascending chronological order (1,2,3,4,5)
                        let isCorrect = true;
                        for (let i = 0; i < selectedOrder.length; i++) {
                            if (selectedOrder[i] !== i + 1) {
                                isCorrect = false;
                                break;
                            }
                        }

                        return { score: isCorrect ? 5 : 0, max: 5 };
                    }
                },
                'matching-figures': {
                    title: 'Match Historical Figures',
                    maxScore: 5,
                    content: `
                        <p><strong>Select the correct role for each historical figure:</strong></p>
                        <div style="margin: 20px 0; display: grid; gap: 15px;">
                            <div class="matching-item">
                                <strong>Mariano Gomez</strong>
                                <select class="match-answer" data-answer="A" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select role...</option>
                                    <option value="D">Jesuit priest who visited Rizal</option>
                                    <option value="A">Filipino priest, elderly member of Gomburza executed in 1872</option>
                                    <option value="C">Filipino soldier who led the uprising</option>
                                    <option value="B">Spanish Governor-General who removed privileges</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Jose Burgos</strong>
                                <select class="match-answer" data-answer="B" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select role...</option>
                                    <option value="C">Filipino soldier who led the uprising</option>
                                    <option value="D">Governor of Cavite during the mutiny</option>
                                    <option value="B">Parish priest accused in the mutiny; advocate of secularization</option>
                                    <option value="A">Spanish Governor-General who removed privileges</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Jacinto Zamora</strong>
                                <select class="match-answer" data-answer="C" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select role...</option>
                                    <option value="B">Governor-General who imposed new taxes</option>
                                    <option value="D">Spanish military commander in Fort San Felipe</option>
                                    <option value="A">Filipino soldier who started the revolt</option>
                                    <option value="C">Priest executed with Gomez and Burgos despite weak evidence</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Rafael de Izquierdo</strong>
                                <select class="match-answer" data-answer="D" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select role...</option>
                                    <option value="C">Parish priest of Bacoor</option>
                                    <option value="A">Filipino reformist writer</option>
                                    <option value="D">Spanish Governor-General who removed privileges and tightened policies</option>
                                    <option value="B">Leader of the Cavite arsenal workers</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Sergeant La Madrid</strong>
                                <select class="match-answer" data-answer="E" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select role...</option>
                                    <option value="B">Spanish judge during the trials</option>
                                    <option value="E">Filipino soldier who led the uprising at Fort San Felipe</option>
                                    <option value="A">Priest accused in the Cavite Mutiny</option>
                                    <option value="C">Katipunan member in 1896</option>
                                </select>
                            </div>
                        </div>
                        <div id="matching-feedback" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
                    `,
                    check: function() {
                        let score = 0;
                        document.querySelectorAll('.match-answer').forEach((select) => {
                            if (select.value === select.dataset.answer) {
                                score++;
                            }
                        });
                        return { score: score, max: 5 };
                    }
                },
                'fillblank-cavite': {
                    title: 'Complete the Historical Narrative',
                    maxScore: 10,
                    content: `
                        <p><strong>Fill in the missing words to complete this historical account:</strong></p>
                        <div style="margin: 20px 0; line-height: 1.8; color: #555; font-size: 15px;">
                            In <input type="text" class="blank-input" data-answer="1872" placeholder="[year]" style="width: 80px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>, Filipino soldiers and workers at the arsenal in 
                            <input type="text" class="blank-input" data-answer="Cavite" placeholder="[location]" style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> became angry after Spanish authorities removed their privileges such as exemption from tribute and forced labor. These changes were ordered by Governor-General 
                            <input type="text" class="blank-input" data-answer="Rafael de Izquierdo" placeholder="[governor]" style="width: 160px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>. On the night of January 20, 1872, a group of soldiers led by Sergeant 
                            <input type="text" class="blank-input" data-answer="La Madrid" placeholder="[leader]" style="width: 120px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> staged an uprising at 
                            <input type="text" class="blank-input" data-answer="Fort San Felipe" placeholder="[fort]" style="width: 130px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>. They expected support from other Filipino troops, but no 
                            <input type="text" class="blank-input" data-answer="reinforcements" placeholder="[support]" style="width: 130px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> came, so the mutiny quickly failed. After the revolt was crushed, the Spanish government blamed Filipino priests and reformists. Three priests known as 
                            <input type="text" class="blank-input" data-answer="Gomburza" placeholder="[priests]" style="width: 110px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> — 
                            <input type="text" class="blank-input" data-answer="Gomez" placeholder="[first]" style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>, 
                            <input type="text" class="blank-input" data-answer="Burgos" placeholder="[second]" style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>, and 
                            <input type="text" class="blank-input" data-answer="Zamora" placeholder="[third]" style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> — were accused of involvement. On February 17, 1872, they were executed by garrote at Bagumbayan, an event that strengthened Filipino nationalism and later inspired heroes like Jose Rizal.
                        </div>
                        <div id="fillblank-feedback" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
                    `,
                    check: function() {
                        let score = 0;
                        document.querySelectorAll('.blank-input').forEach((input) => {
                            if (input.value.toLowerCase().trim() === input.dataset.answer.toLowerCase()) {
                                score++;
                            }
                        });
                        return { score: score, max: 10 };
                    }
                },
                'timeline-first-mass': {
                    title: 'First Mass Historical Events',
                    maxScore: 6,
                    content: `
                        <p style="font-size: 16px; color: #51513E; margin-bottom: 24px; font-weight: 500;"><strong>Arrange these events in the correct chronological order:</strong></p>
                        <div style="margin: 20px 0; display: grid; gap: 12px;">
                            <div class="timeline-item" data-order="3" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Pigafetta's account becomes the primary historical document for the First Mass.</span>
                            </div>
                            <div class="timeline-item" data-order="1" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Tradition believes the First Mass was celebrated in Butuan.</span>
                            </div>
                            <div class="timeline-item" data-order="5" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Scholars debate the geographical accuracy of Butuan as the location.</span>
                            </div>
                            <div class="timeline-item" data-order="2" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">A monument is erected in Butuan claiming the First Mass took place there.</span>
                            </div>
                            <div class="timeline-item" data-order="4" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Francisco Albo's navigational records provide evidence supporting Limasawa.</span>
                            </div>
                            <div class="timeline-item" data-order="6" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Modern historiography shifts toward accepting Limasawa as the correct location.</span>
                            </div>
                        </div>
                        <div id="timeline-feedback" style="margin-top: 20px; padding: 16px; border-radius: 8px; display: none; border-left: 4px solid #28a745;"></div>
                    `,
                    check: function() {
                        if (timelineSelectionOrder.length < 6) {
                            return { score: 0, max: 6 };
                        }
                        const selectedOrder = timelineSelectionOrder.map(item => parseInt(item.getAttribute('data-order')));
                        let isCorrect = true;
                        for (let i = 0; i < selectedOrder.length; i++) {
                            if (selectedOrder[i] !== i + 1) {
                                isCorrect = false;
                                break;
                            }
                        }
                        return { score: isCorrect ? 6 : 0, max: 6 };
                    }
                },
                'matching-first-mass': {
                    title: 'Match Historical Figures & Evidence',
                    maxScore: 5,
                    content: `
                        <p><strong>Match explorers and historians with their contributions:</strong></p>
                        <div style="margin: 20px 0; display: grid; gap: 15px;">
                            <div class="matching-item">
                                <strong>Ferdinand Magellan</strong>
                                <select class="match-answer" data-answer="A" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select contribution...</option>
                                    <option value="C">Local ruler who welcomed Magellan and attended the Mass</option>
                                    <option value="D">Priest who officiated the First Catholic Mass in 1521</option>
                                    <option value="A">Portuguese explorer who led the expedition that reached the Philippines in 1521</option>
                                    <option value="B">Chronicler who documented Magellan's voyage and the First Mass</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Antonio Pigafetta</strong>
                                <select class="match-answer" data-answer="B" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select contribution...</option>
                                    <option value="D">Priest who officiated the First Catholic Mass in 1521</option>
                                    <option value="A">Portuguese explorer who led the expedition that reached the Philippines in 1521</option>
                                    <option value="B">Chronicler who documented Magellan's voyage and the First Mass</option>
                                    <option value="C">Local ruler who welcomed Magellan and attended the Mass</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Rajah Kolambu</strong>
                                <select class="match-answer" data-answer="C" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select contribution...</option>
                                    <option value="B">Chronicler who documented Magellan's voyage and the First Mass</option>
                                    <option value="C">Local ruler who welcomed Magellan and attended the Mass</option>
                                    <option value="D">Priest who officiated the First Catholic Mass in 1521</option>
                                    <option value="A">Portuguese explorer who led the expedition that reached the Philippines in 1521</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Rajah Siagu</strong>
                                <select class="match-answer" data-answer="E" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select contribution...</option>
                                    <option value="E">Native ruler of Limasawa who was present during the First Mass</option>
                                    <option value="C">Local ruler who welcomed Magellan and attended the Mass</option>
                                    <option value="A">Portuguese explorer who led the expedition that reached the Philippines in 1521</option>
                                    <option value="B">Chronicler who documented Magellan's voyage and the First Mass</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Fr. Pedro de Valderrama</strong>
                                <select class="match-answer" data-answer="D" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select contribution...</option>
                                    <option value="B">Chronicler who documented Magellan's voyage and the First Mass</option>
                                    <option value="A">Portuguese explorer who led the expedition that reached the Philippines in 1521</option>
                                    <option value="D">Priest who officiated the First Catholic Mass in 1521</option>
                                    <option value="C">Local ruler who welcomed Magellan and attended the Mass</option>
                                </select>
                            </div>
                        </div>
                        <div id="matching-feedback" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
                    `,
                    check: function() {
                        let score = 0;
                        document.querySelectorAll('.match-answer').forEach((select) => {
                            if (select.value === select.dataset.answer) {
                                score++;
                            }
                        });
                        return { score: score, max: 5 };
                    }
                },
                'fillblank-first-mass': {
                    title: 'Complete the Geographical Analysis',
                    maxScore: 6,
                    content: `
                        <p><strong>Fill in the missing geographical and historical terms:</strong></p>
                        <div style="margin: 20px 0; line-height: 1.8; color: #555; font-size: 15px;">
                            The First Mass debate centers on identifying whether the Mass was held in <input type="text" class="blank-input" data-answer="Butuan" placeholder="[city]" style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> or
                            <input type="text" class="blank-input" data-answer="Limasawa" placeholder="[island]" style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>. The primary source document comes from
                            <input type="text" class="blank-input" data-answer="Antonio Pigafetta" placeholder="[crew member]" style="width: 150px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>, who sailed with Magellan.
                            <input type="text" class="blank-input" data-answer="Francisco Albo" placeholder="[navigator]" style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> provided navigational logs showing
                            <input type="text" class="blank-input" data-answer="latitude and longitude coordinates" placeholder="[navigation data]" style="width: 180px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>. The absence of a <input type="text" class="blank-input" data-answer="river" placeholder="[geographic feature]" style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> in Butuan's accounts supports the Limasawa claim.
                        </div>
                        <div id="fillblank-feedback" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
                    `,
                    check: function() {
                        let score = 0;
                        document.querySelectorAll('.blank-input').forEach((input) => {
                            if (input.value.toLowerCase().trim() === input.dataset.answer.toLowerCase()) {
                                score++;
                            }
                        });
                        return { score: score, max: 6 };
                    }
                },
                'timeline-rizal': {
                    title: 'Rizal\'s Final Days Timeline',
                    maxScore: 8,
                    content: `
                        <p style="font-size: 16px; color: #51513E; margin-bottom: 24px; font-weight: 500;"><strong>Arrange events from Rizal's final hours in correct sequence:</strong></p>
                        <div style="margin: 20px 0; display: grid; gap: 12px;">
                            <div class="timeline-item" data-order="2" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Pio Valenzuela visits Rizal in Dapitan to inform him of the planned revolution.</span>
                            </div>
                            <div class="timeline-item" data-order="4" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Rizal is arrested and imprisoned, awaiting trial and execution.</span>
                            </div>
                            <div class="timeline-item" data-order="6" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Rizal requests a prayer book upon entering death row at 12:30 PM.</span>
                            </div>
                            <div class="timeline-item" data-order="1" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Rizal is deported from the Philippines due to his writings and activism.</span>
                            </div>
                            <div class="timeline-item" data-order="7" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Jesuit priests present Rizal with a pre-prepared retraction document.</span>
                            </div>
                            <div class="timeline-item" data-order="3" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Rizal is tried and sentenced to death by the Spanish authorities.</span>
                            </div>
                            <div class="timeline-item" data-order="8" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Rizal is executed by firing squad on December 30, 1896.</span>
                            </div>
                            <div class="timeline-item" data-order="5" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Rizal's alleged nuptial ceremony at the point of death occurs at 5:00 AM.</span>
                            </div>
                        </div>
                        <div id="timeline-feedback" style="margin-top: 20px; padding: 16px; border-radius: 8px; display: none; border-left: 4px solid #28a745;"></div>
                    `,
                    check: function() {
                        if (timelineSelectionOrder.length < 8) {
                            return { score: 0, max: 8 };
                        }
                        const selectedOrder = timelineSelectionOrder.map(item => parseInt(item.getAttribute('data-order')));
                        let isCorrect = true;
                        for (let i = 0; i < selectedOrder.length; i++) {
                            if (selectedOrder[i] !== i + 1) {
                                isCorrect = false;
                                break;
                            }
                        }
                        return { score: isCorrect ? 8 : 0, max: 8 };
                    }
                },
                'matching-rizal': {
                    title: 'Identify Key Figures in Retraction',
                    maxScore: 5,
                    content: `
                        <p><strong>Match Jesuit priests and officials with their roles:</strong></p>
                        <div style="margin: 20px 0; display: grid; gap: 15px;">
                            <div class="matching-item">
                                <strong>Jose Rizal</strong>
                                <select class="match-answer" data-answer="A" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select role...</option>
                                    <option value="D">Priests who visited Rizal in Fort Santiago</option>
                                    <option value="C">Spanish official who presided over Rizal's trial and execution</option>
                                    <option value="A">Filipino nationalist executed at Bagumbayan; visited by Jesuits before execution</option>
                                    <option value="B">Jesuit priest who visited Rizal in Fort Santiago and claimed Rizal retracted</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Fr. Vicente Balaguer</strong>
                                <select class="match-answer" data-answer="B" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select role...</option>
                                    <option value="C">Spanish official who presided over Rizal's trial and execution</option>
                                    <option value="A">Filipino nationalist executed at Bagumbayan; visited by Jesuits before execution</option>
                                    <option value="D">Priests who visited Rizal in Fort Santiago</option>
                                    <option value="B">Jesuit priest who visited Rizal in Fort Santiago and claimed Rizal retracted</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Governor-General Camilo de Polavieja</strong>
                                <select class="match-answer" data-answer="C" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select role...</option>
                                    <option value="B">Jesuit priest who visited Rizal in Fort Santiago and claimed Rizal retracted</option>
                                    <option value="D">Priests who visited Rizal in Fort Santiago</option>
                                    <option value="C">Spanish official who presided over Rizal's trial and execution</option>
                                    <option value="A">Filipino nationalist executed at Bagumbayan; visited by Jesuits before execution</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Jesuit Priests (visiting Rizal)</strong>
                                <select class="match-answer" data-answer="D" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select role...</option>
                                    <option value="A">Filipino nationalist executed at Bagumbayan; visited by Jesuits before execution</option>
                                    <option value="C">Spanish official who presided over Rizal's trial and execution</option>
                                    <option value="D">Priests who visited Rizal in Fort Santiago and assisted with his retraction</option>
                                    <option value="B">Jesuit priest who visited Rizal in Fort Santiago and claimed Rizal retracted</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Witnesses of Retraction Document</strong>
                                <select class="match-answer" data-answer="E" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select role...</option>
                                    <option value="C">Spanish official who presided over Rizal's trial and execution</option>
                                    <option value="E">Verified Rizal's retraction document after 1935 discovery</option>
                                    <option value="B">Jesuit priest who visited Rizal in Fort Santiago and claimed Rizal retracted</option>
                                    <option value="D">Priests who visited Rizal in Fort Santiago and assisted with his retraction</option>
                                </select>
                            </div>
                        </div>
                        <div id="matching-feedback" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
                    `,
                    check: function() {
                        let score = 0;
                        document.querySelectorAll('.match-answer').forEach((select) => {
                            if (select.value === select.dataset.answer) {
                                score++;
                            }
                        });
                        return { score: score, max: 5 };
                    }
                },
                'fillblank-rizal': {
                    title: 'Complete the Historical Account',
                    maxScore: 7,
                    content: `
                        <p><strong>Fill in critical details about Rizal's retraction:</strong></p>
                        <div style="margin: 20px 0; line-height: 1.8; color: #555; font-size: 15px;">
                            On <input type="text" class="blank-input" data-answer="December 29, 1896" placeholder="[date]" style="width: 140px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>, the allegedly retracted document was signed by Rizal.
                            The document was allegedly written at <input type="text" class="blank-input" data-answer="12:30 PM" placeholder="[time]" style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> on the morning of his execution.
                            <input type="text" class="blank-input" data-answer="Fr. Vicente Balaguer" placeholder="[priest name]" style="width: 160px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> claimed to witness Rizal writing the document.
                            The <input type="text" class="blank-input" data-answer="Cuerpo de Vigilancia" placeholder="[organization]" style="width: 140px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> report provides detailed accounts of Rizal's final hours.
                            Rizal's retraction document surfaced <input type="text" class="blank-input" data-answer="40 years" placeholder="[time period]" style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> after his execution in <input type="text" class="blank-input" data-answer="1935" placeholder="[year]" style="width: 70px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>.
                            The existence of this document remains <input type="text" class="blank-input" data-answer="controversial" placeholder="[adjective]" style="width: 120px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> among historians.
                        </div>
                        <div id="fillblank-feedback" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
                    `,
                    check: function() {
                        let score = 0;
                        document.querySelectorAll('.blank-input').forEach((input) => {
                            if (input.value.toLowerCase().trim() === input.dataset.answer.toLowerCase()) {
                                score++;
                            }
                        });
                        return { score: score, max: 7 };
                    }
                },
                'timeline-cry-rebellion': {
                    title: 'Cry of Rebellion Timeline',
                    maxScore: 5,
                    content: `
                        <p style="font-size: 16px; color: #51513E; margin-bottom: 24px; font-weight: 500;"><strong>Arrange revolutionary events in the correct chronological order:</strong></p>
                        <div style="margin: 20px 0; display: grid; gap: 12px;">
                            <div class="timeline-item" data-order="1" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">The Katipunan, a secret revolutionary society, was discovered by Spanish authorities in Manila.</span>
                            </div>
                            <div class="timeline-item" data-order="2" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Andres Bonifacio gathered fellow revolutionaries in Pugad Lawin (or Balintawak) to plan a revolt.</span>
                            </div>
                            <div class="timeline-item" data-order="3" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">The revolutionaries tore their cedulas (residence certificates) as a symbolic act of defiance against Spanish rule.</span>
                            </div>
                            <div class="timeline-item" data-order="4" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">The Cry of Balintawak/Pugad Lawin officially signaled the start of the Philippine Revolution against Spain.</span>
                            </div>
                            <div class="timeline-item" data-order="5" onclick="selectTimelineItem(this)" style="padding: 16px 18px; background: linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%); border-radius: 10px; cursor: pointer; border: 2px solid #D6DCE1; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;">
                                <input type="checkbox" class="timeline-check" style="width: 18px; height: 18px; cursor: pointer;"> <span style="color: #51513E; font-weight: 500;">Fighting erupted in several provinces, marking the beginning of organized revolutionary actions throughout the Philippines.</span>
                            </div>
                        </div>
                        <div id="timeline-feedback" style="margin-top: 20px; padding: 16px; border-radius: 8px; display: none; border-left: 4px solid #28a745;"></div>
                    `,
                    check: function() {
                        if (timelineSelectionOrder.length < 5) {
                            return { score: 0, max: 5 };
                        }
                        const selectedOrder = timelineSelectionOrder.map(item => parseInt(item.getAttribute('data-order')));
                        let isCorrect = true;
                        for (let i = 0; i < selectedOrder.length; i++) {
                            if (selectedOrder[i] !== i + 1) {
                                isCorrect = false;
                                break;
                            }
                        }
                        return { score: isCorrect ? 5 : 0, max: 5 };
                    }
                },
                'matching-cry-rebellion': {
                    title: 'Match Revolutionary Leaders & Actions',
                    maxScore: 5,
                    content: `
                        <p><strong>Match revolutionary leaders with their significant contributions:</strong></p>
                        <div style="margin: 20px 0; display: grid; gap: 15px;">
                            <div class="matching-item">
                                <strong>Andres Bonifacio</strong>
                                <select class="match-answer" data-answer="A" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select contribution...</option>
                                    <option value="C">Provided food, shelter, and medical care to Katipuneros</option>
                                    <option value="A">Founder of the Katipunan; led the Cry of Pugad Lawin and tore cedulas</option>
                                    <option value="D">Early Katipunan member who helped organize meetings</option>
                                    <option value="B">Bonifacio's advisor; wrote the "Kartilya ng Katipunan"</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Emilio Jacinto</strong>
                                <select class="match-answer" data-answer="B" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select contribution...</option>
                                    <option value="D">Early Katipunan member who helped organize meetings</option>
                                    <option value="B">Bonifacio's advisor; wrote the "Kartilya ng Katipunan" and guided revolutionary strategies</option>
                                    <option value="A">Founder of the Katipunan; led the Cry of Pugad Lawin and tore cedulas</option>
                                    <option value="C">Provided food, shelter, and medical care to Katipuneros</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Melchora Aquino (Tandang Sora)</strong>
                                <select class="match-answer" data-answer="C" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select contribution...</option>
                                    <option value="B">Bonifacio's advisor; wrote the "Kartilya ng Katipunan"</option>
                                    <option value="D">Early Katipunan member who helped organize meetings</option>
                                    <option value="C">Provided food, shelter, and medical care to Katipuneros; called the "Mother of the Revolution"</option>
                                    <option value="A">Founder of the Katipunan; led the Cry of Pugad Lawin and tore cedulas</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Teodoro Plata</strong>
                                <select class="match-answer" data-answer="D" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select contribution...</option>
                                    <option value="A">Founder of the Katipunan; led the Cry of Pugad Lawin and tore cedulas</option>
                                    <option value="C">Provided food, shelter, and medical care to Katipuneros</option>
                                    <option value="D">Early Katipunan member who helped organize meetings and logistics</option>
                                    <option value="B">Bonifacio's advisor; wrote the "Kartilya ng Katipunan"</option>
                                </select>
                            </div>
                            <div class="matching-item">
                                <strong>Andres Bonifacio's Katipunan Members (general)</strong>
                                <select class="match-answer" data-answer="E" style="width: 100%; padding: 8px; margin-top: 5px;">
                                    <option value="">Select contribution...</option>
                                    <option value="B">Bonifacio's advisor; wrote the "Kartilya ng Katipunan"</option>
                                    <option value="E">Participated in tearing cedulas and initiating uprisings in multiple provinces</option>
                                    <option value="D">Early Katipunan member who helped organize meetings</option>
                                    <option value="C">Provided food, shelter, and medical care to Katipuneros</option>
                                </select>
                            </div>
                        </div>
                        <div id="matching-feedback" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
                    `,
                    check: function() {
                        let score = 0;
                        document.querySelectorAll('.match-answer').forEach((select) => {
                            if (select.value === select.dataset.answer) {
                                score++;
                            }
                        });
                        return { score: score, max: 5 };
                    }
                },
                'fillblank-cry-rebellion': {
                    title: 'Complete Revolutionary Accounts',
                    maxScore: 8,
                    content: `
                        <p><strong>Fill in historical details from the Cry of Rebellion:</strong></p>
                        <div style="margin: 20px 0; line-height: 1.8; color: #555; font-size: 15px;">
                            <input type="text" class="blank-input" data-answer="Andrés Bonifacio" placeholder="[founder]" style="width: 150px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> founded the <input type="text" class="blank-input" data-answer="Katipunan" placeholder="[organization]" style="width: 120px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>, a secret revolutionary society. The Katipunan required its members to take a <input type="text" class="blank-input" data-answer="blood oath" placeholder="[ritual]" style="width: 110px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> during initiation. The capital of the Philippines, <input type="text" class="blank-input" data-answer="Manila" placeholder="[city]" style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>, became the center of Katipunan organizing.
                            Spanish authorities discovered the secret society, prompting Bonifacio to call for an armed uprising. <input type="text" class="blank-input" data-answer="Emilio Aguinaldo" placeholder="[military leader]" style="width: 160px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> eventually took command of the revolution.
                            The movement transitioned from secret society to <input type="text" class="blank-input" data-answer="armed rebellion" placeholder="[form]" style="width: 120px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/>.
                            Though Bonifacio was captured and executed, the revolution <input type="text" class="blank-input" data-answer="continued" placeholder="[verb]" style="width: 110px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;"/> under new leadership.
                        </div>
                        <div id="fillblank-feedback" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
                    `,
                    check: function() {
                        let score = 0;
                        document.querySelectorAll('.blank-input').forEach((input) => {
                            if (input.value.toLowerCase().trim() === input.dataset.answer.toLowerCase()) {
                                score++;
                            }
                        });
                        return { score: score, max: 8 };
                    }
                }
            },

            openTask(taskId) {
                const task = this.tasks[taskId];
                if (!task) return;

                this.currentTask = taskId;
                this.currentMaxScore = task.maxScore;
                document.getElementById('taskTitle').textContent = task.title;
                document.getElementById('taskContent').innerHTML = task.content;
                document.getElementById('taskModal').style.display = 'flex';

                // Make utility functions available globally
                window.selectTimelineItem = selectTimelineItem;

            },

            init() {
                // Filter functionality
                document.querySelectorAll('.filter-chip').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
                        e.target.classList.add('active');
                        const filter = e.target.dataset.filter;

                        // Filter tasks based on selection
                        if (filter === 'all') {
                            document.querySelectorAll('.task-card').forEach(card => card.style.display = '');
                        } else {
                            document.querySelectorAll('.task-card').forEach(card => {
                                card.style.display = card.dataset.topic === filter ? '' : 'none';
                            });
                        }
                    });
                });

                // Modal close
                const closeBtn = document.getElementById('closeTaskModal');
                const cancelBtn = document.getElementById('cancelTaskBtn');
                const submitBtn = document.getElementById('submitTaskBtn');
                const modal = document.getElementById('taskModal');

                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        modal.style.display = 'none';
                    });
                }

                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        modal.style.display = 'none';
                    });
                }

                if (submitBtn) {
                    submitBtn.addEventListener('click', async () => await this.submitTask());
                }

                // Close modal when clicking outside
                window.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                    }
                });
            },

            async submitTask() {
                const task = this.tasks[this.currentTask];
                if (!task || !task.check) return;

                const result = task.check();
                const percentage = Math.round((result.score / result.max) * 100);

                // Show score result
                const message = `<div style="padding: 20px; background: ${percentage >= 70 ? '#d4edda' : '#fff3cd'}; border: 1px solid ${percentage >= 70 ? '#c3e6cb' : '#ffc107'}; border-radius: 8px; text-align: center;">
                    <h3 style="margin: 0 0 10px 0; color: ${percentage >= 70 ? '#155724' : '#856404'};">You got ${result.score}/${result.max}</h3>
                    <p style="margin: 0; color: ${percentage >= 70 ? '#155724' : '#856404'}; font-size: 14px;">Score: ${percentage}%</p>
                </div>`;

                document.getElementById('taskContent').innerHTML = message;
                document.getElementById('submitTaskBtn').style.display = 'none';

                // Save task progress to Supabase
                try {
                    const supabaseClient = await getSupabaseClient();
                    const { data: { user } } = await supabaseClient.auth.getUser();

                    if (user) {
                        // Check if task already exists
                        const { data: existingTask } = await supabaseClient
                            .from('user_task_progress')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('task_id', this.currentTask)
                            .single();

                        const taskData = {
                            user_id: user.id,
                            task_id: this.currentTask,
                            score: result.score,
                            max_score: result.max,
                            is_completed: percentage >= 70,
                            completed_at: new Date().toISOString()
                        };

                        if (existingTask) {
                            // Update existing
                            await supabaseClient
                                .from('user_task_progress')
                                .update(taskData)
                                .eq('id', existingTask.id);
                        } else {
                            // Insert new
                            await supabaseClient
                                .from('user_task_progress')
                                .insert([taskData]);
                        }

                        // Refresh stats after saving
                        setTimeout(() => {
                            loadTaskStats();
                        }, 500);
                    }
                } catch (error) {
                    console.error('Error saving task progress:', error);
                }

                // Add close button
                setTimeout(() => {
                    const newBtn = document.createElement('button');
                    newBtn.className = 'btn-cancel';
                    newBtn.textContent = 'Close';
                    newBtn.onclick = () => {
                        document.getElementById('taskModal').style.display = 'none';
                        document.getElementById('submitTaskBtn').style.display = 'block';
                    };
                    document.querySelector('.modal-footer').insertBefore(newBtn, document.getElementById('submitTaskBtn'));
                }, 100);
            }
        };

        // Track selection order globally
        let timelineSelectionOrder = [];

        // Helper function for timeline selection
        function selectTimelineItem(element) {
            const checkbox = element.querySelector('.timeline-check');
            const orderBadge = element.querySelector('.order-badge');

            if (!checkbox.checked) {
                // Adding to selection
                checkbox.checked = true;
                timelineSelectionOrder.push(element);

                element.style.borderColor = '#5C3422';
                element.style.backgroundColor = '#EBE4DC';
                element.style.boxShadow = '0 6px 20px rgba(92, 52, 34, 0.15)';
                element.style.transform = 'translateY(-2px)';

                // Add numbered badge
                const badge = document.createElement('span');
                badge.className = 'order-badge';
                badge.textContent = timelineSelectionOrder.length;
                badge.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #5C3422 0%, #7A5B47 100%);
                    color: white;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    min-width: 32px;
                    font-weight: 700;
                    margin-left: 12px;
                    font-size: 14px;
                    box-shadow: 0 4px 12px rgba(92, 52, 34, 0.3);
                    flex-shrink: 0;
                `;
                element.appendChild(badge);
            } else {
                // Removing from selection
                checkbox.checked = false;
                const index = timelineSelectionOrder.indexOf(element);
                if (index > -1) {
                    timelineSelectionOrder.splice(index, 1);
                }

                element.style.borderColor = '#D6DCE1';
                element.style.backgroundColor = 'linear-gradient(135deg, #F9F7F4 0%, #FFFFFF 100%)';
                element.style.boxShadow = 'none';
                element.style.transform = 'translateY(0)';

                // Remove badge
                if (orderBadge) {
                    orderBadge.remove();
                }
            }

            // Update all badges to show correct order
            timelineSelectionOrder.forEach((item, idx) => {
                const badge = item.querySelector('.order-badge');
                if (badge) {
                    badge.textContent = idx + 1;
                }
            });
        }

        // Submit timeline task
        function submitTimelineTask() {
            if (timelineSelectionOrder.length < 8) {
                const feedback = document.getElementById('timeline-feedback');
                feedback.style.display = 'block';
                feedback.style.backgroundColor = '#f8d7da';
                feedback.style.borderLeft = '4px solid #dc3545';
                feedback.innerHTML = '<strong style="color: #721c24;">✗ Incomplete</strong><p style="margin: 5px 0 0 0; color: #721c24;">Please select all 8 events before submitting.</p>';
                return;
            }

            // Check if the order they CLICKED matches the chronological order (1-8)
            // The timelineSelectionOrder array is in the order they clicked
            // We need to verify the actual data-order values are in sequence 1,2,3,4,5,6,7,8
            const selectedOrder = timelineSelectionOrder.map(item => parseInt(item.getAttribute('data-order')));

            // Check if they're in ascending chronological order
            let isCorrect = true;
            for (let i = 0; i < selectedOrder.length; i++) {
                if (selectedOrder[i] !== i + 1) {
                    isCorrect = false;
                    break;
                }
            }

            const feedback = document.getElementById('timeline-feedback');
            feedback.style.display = 'block';

            if (isCorrect) {
                feedback.style.backgroundColor = '#d4edda';
                feedback.style.borderLeft = '4px solid #28a745';
                feedback.innerHTML = '<strong style="color: #155724;">✓ Correct!</strong><p style="margin: 5px 0 0 0; color: #155724;">You arranged all events in the correct chronological order. Excellent!</p>';
            } else {
                feedback.style.backgroundColor = '#f8d7da';
                feedback.style.borderLeft = '4px solid #dc3545';
                feedback.innerHTML = '<strong style="color: #721c24;">✗ Incorrect Order</strong><p style="margin: 5px 0 0 0; color: #721c24;">You selected all 8 events, but not in the correct chronological order. Try again!</p>';
            }
        }

        // Submit matching task
        function submitMatchingTask() {
            let correctCount = 0;
            const matchAnswers = document.querySelectorAll('.match-answer');

            matchAnswers.forEach((select) => {
                if (select.value === select.dataset.answer) {
                    correctCount++;
                }
            });

            const feedback = document.getElementById('matching-feedback');
            feedback.style.display = 'block';

            if (correctCount === 4) {
                feedback.style.backgroundColor = '#d4edda';
                feedback.style.borderLeft = '4px solid #28a745';
                feedback.innerHTML = '<strong style="color: #155724;">✓ Perfect!</strong><p style="margin: 5px 0 0 0; color: #155724;">You matched all historical figures correctly. Excellent work!</p>';
            } else if (correctCount >= 2) {
                feedback.style.backgroundColor = '#fff3cd';
                feedback.style.borderLeft = '4px solid #ffc107';
                feedback.innerHTML = `<strong style="color: #856404;">⚠ Partial</strong><p style="margin: 5px 0 0 0; color: #856404;">You got ${correctCount} out of 4 correct. Try again to get them all!</p>`;
            } else {
                feedback.style.backgroundColor = '#f8d7da';
                feedback.style.borderLeft = '4px solid #dc3545';
                feedback.innerHTML = `<strong style="color: #721c24;">✗ Incorrect</strong><p style="margin: 5px 0 0 0; color: #721c24;">You got ${correctCount} out of 4 correct. Try again!</p>`;
            }
        }

        // Submit fill blanks task
        function submitFillBlanksTask() {
            let correctCount = 0;
            const blankInputs = document.querySelectorAll('.blank-input');

            blankInputs.forEach((input) => {
                if (input.value.toLowerCase().trim() === input.dataset.answer.toLowerCase()) {
                    correctCount++;
                }
            });

            const totalBlanks = blankInputs.length;
            const feedback = document.getElementById('fillblank-feedback');
            feedback.style.display = 'block';

            if (correctCount === totalBlanks) {
                feedback.style.backgroundColor = '#d4edda';
                feedback.style.borderLeft = '4px solid #28a745';
                feedback.innerHTML = '<strong style="color: #155724;">✓ Perfect!</strong><p style="margin: 5px 0 0 0; color: #155724;">You filled in all the blanks correctly. Great job!</p>';
            } else if (correctCount >= Math.ceil(totalBlanks / 2)) {
                feedback.style.backgroundColor = '#fff3cd';
                feedback.style.borderLeft = '4px solid #ffc107';
                feedback.innerHTML = `<strong style="color: #856404;">⚠ Partial</strong><p style="margin: 5px 0 0 0; color: #856404;">You got ${correctCount} out of ${totalBlanks} correct. Try again!</p>`;
            } else {
                feedback.style.backgroundColor = '#f8d7da';
                feedback.style.borderLeft = '4px solid #dc3545';
                feedback.innerHTML = `<strong style="color: #721c24;">✗ Incorrect</strong><p style="margin: 5px 0 0 0; color: #721c24;">You got ${correctCount} out of ${totalBlanks} correct. Try again!</p>`;
            }
        }

        // Setup modal event listeners
        document.addEventListener('DOMContentLoaded', () => {
            const taskModal = document.getElementById('taskModal');
            const closeTaskModal = document.getElementById('closeTaskModal');
            const cancelTaskBtn = document.getElementById('cancelTaskBtn');
            const submitTaskBtn = document.getElementById('submitTaskBtn');
            const taskContent = document.getElementById('taskContent');

            if (closeTaskModal) {
                closeTaskModal.addEventListener('click', () => {
                    taskModal.style.display = 'none';
                });
            }

            if (cancelTaskBtn) {
                cancelTaskBtn.addEventListener('click', () => {
                    taskModal.style.display = 'none';
                });
            }

            if (submitTaskBtn) {
                submitTaskBtn.addEventListener('click', () => {
                    // Check which task is active by looking for specific elements
                    if (taskContent.querySelector('.timeline-item')) {
                        submitTimelineTask();
                    } else if (taskContent.querySelector('.match-answer')) {
                        submitMatchingTask();
                    } else if (taskContent.querySelector('.blank-input')) {
                        submitFillBlanksTask();
                    }
                });
                submitTaskBtn.style.display = 'block';
            }
        });

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            TaskManager.init();
            if (window.lucide) {
                lucide.createIcons();
            }
            // Load stats from Supabase
            loadTaskStats();
            // Load user profile
            populateUserProfile();
            // Initialize sidebar nav dropdowns
            initializeSidebarDropdowns();
            // Initialize topic sections (accordion)
            initializeTopicSections();
        });

        // ==================== SIDEBAR NAV DROPDOWNS ====================
        function initializeSidebarDropdowns() {
            const dropdownToggles = document.querySelectorAll('.nav-item-dropdown .nav-item');
            
            dropdownToggles.forEach(toggle => {
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const dropdown = toggle.closest('.nav-item-dropdown');
                    const menu = dropdown.querySelector('.dropdown-menu');
                    
                    // Toggle menu visibility
                    const isVisible = menu.style.display === 'flex';
                    
                    // Close all other menus
                    document.querySelectorAll('.dropdown-menu').forEach(otherMenu => {
                        otherMenu.style.display = 'none';
                    });
                    
                    // Toggle current menu
                    menu.style.display = isVisible ? 'none' : 'flex';
                });
            });
            
            // Close all menus when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.nav-item-dropdown')) {
                    document.querySelectorAll('.dropdown-menu').forEach(menu => {
                        menu.style.display = 'none';
                    });
                }
            });
        }

        // ==================== TOPIC SECTION ACCORDION ====================
        function initializeTopicSections() {
            const topicHeaders = document.querySelectorAll('.topic-header');
            
            topicHeaders.forEach(header => {
                header.addEventListener('click', () => {
                    const topicSection = header.parentElement;
                    const wasCollapsed = topicSection.classList.contains('collapsed');
                    
                    // Close all other sections
                    const allSections = document.querySelectorAll('.topic-section');
                    allSections.forEach(section => {
                        if (section !== topicSection) {
                            section.classList.add('collapsed');
                        }
                    });
                    
                    // Toggle the clicked section
                    topicSection.classList.toggle('collapsed');
                    
                    // Re-initialize Lucide icons after DOM changes
                    if (window.lucide && wasCollapsed) {
                        setTimeout(() => lucide.createIcons(), 100);
                    }
                });
            });
            
            // Close all sections by default
            const allSections = document.querySelectorAll('.topic-section');
            allSections.forEach(section => {
                section.classList.add('collapsed');
            });
        }

        // ==================== LOAD TASK STATS ====================
        async function loadTaskStats() {
            try {
                const supabaseClient = await getSupabaseClient();
                const { data: { user } } = await supabaseClient.auth.getUser();

                if (!user) {
                    console.log('No user logged in');
                    return;
                }

                // Fetch all tasks
                const { data: allTasks, error: tasksError } = await supabaseClient
                    .from('user_task_progress')
                    .select('id')
                    .eq('user_id', user.id);

                if (tasksError) throw tasksError;

                // Fetch completed tasks
                const { data: completedTasks, error: completedError } = await supabaseClient
                    .from('user_task_progress')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('is_completed', true);

                if (completedError) throw completedError;

                const totalCount = allTasks?.length || 0;
                const completedCount = completedTasks?.length || 0;
                const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                // Update stats display
                document.getElementById('totalTasks').textContent = totalCount;
                document.getElementById('completedTasks').textContent = completedCount;
                document.getElementById('progressPercent').textContent = progressPercent + '%';
                document.getElementById('progressBar').style.width = progressPercent + '%';

                // Update trend
                document.getElementById('totalTasksTrend').textContent = '→';
                document.getElementById('completedTrend').textContent = completedCount > 0 ? '↑' : '-';

            } catch (error) {
                console.error('Error loading task stats:', error);
            }
        }

        // ==================== PROFILE EDITING SYSTEM ====================
        const taskEditProfileBtn = document.getElementById('editProfileBtn');
        const taskEditProfileModal = document.getElementById('editProfileModal');
        const taskCloseEditModal = document.getElementById('closeEditModal');
        const taskEditAvatarInput = document.getElementById('editAvatar');
        const taskAvatarPreview = document.getElementById('avatarPreview');
        const taskEditNameInput = document.getElementById('editName');
        const taskEditBioInput = document.getElementById('editBio');
        const taskSaveProfileBtn = document.getElementById('saveProfileBtn');
        const taskCancelEditBtn = document.getElementById('cancelEditBtn');

        const taskProfileNameDisplay = document.querySelector('.profile-name');
        const taskProfileEmailDisplay = document.querySelector('.profile-email');
        const taskProfileAvatar = document.querySelector('.profile-avatar');

        // ==================== LOAD PROFILE FROM localStorage ====================
        function loadProfileFromStorage() {
            console.log('🔍 Loading profile from localStorage...');
            const savedName = localStorage.getItem('profileName');
            const savedBio = localStorage.getItem('profileBio');
            const savedAvatar = localStorage.getItem('profileAvatar');

            if (savedName && taskProfileNameDisplay) taskProfileNameDisplay.textContent = savedName;
            if (savedBio && taskProfileEmailDisplay) taskProfileEmailDisplay.textContent = savedBio;
            if (savedAvatar && taskProfileAvatar) taskProfileAvatar.src = savedAvatar;
        }

        // ==================== EDIT PROFILE MODAL MANAGEMENT ====================
        if (taskEditProfileBtn) {
            taskEditProfileBtn.addEventListener('click', function(e) {
                e.preventDefault();
                taskEditProfileModal.style.display = 'flex';
                taskEditNameInput.value = localStorage.getItem('profileName') || '';
                taskEditBioInput.value = localStorage.getItem('profileBio') || '';
                const savedAvatar = localStorage.getItem('profileAvatar');
                if (savedAvatar) taskAvatarPreview.src = savedAvatar;
            });
        }

        if (taskCloseEditModal) {
            taskCloseEditModal.addEventListener('click', function() {
                taskEditProfileModal.style.display = 'none';
            });
        }

        if (taskCancelEditBtn) {
            taskCancelEditBtn.addEventListener('click', function() {
                taskEditProfileModal.style.display = 'none';
            });
        }

        taskEditProfileModal.addEventListener('click', function(e) {
            if (e.target === taskEditProfileModal) {
                taskEditProfileModal.style.display = 'none';
            }
        });

        // ==================== AVATAR FILE UPLOAD ====================
        if (taskEditAvatarInput) {
            taskEditAvatarInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const base64String = event.target.result;
                        taskAvatarPreview.src = base64String;
                        console.log('📝 Avatar preview updated');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // ==================== SAVE PROFILE CHANGES ====================
        if (taskSaveProfileBtn) {
            taskSaveProfileBtn.addEventListener('click', function() {
                alert('To change your profile, please navigate to the Feed page (course.html). Click on your profile picture in the sidebar to edit your profile there.');
                taskEditProfileModal.style.display = 'none';
            });
        }

        // ==================== MUTATIONOBSERVER: RESTORE PROFILE ON CHANGES ====================
        const taskObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.target === taskProfileNameDisplay && taskProfileNameDisplay.textContent !== localStorage.getItem('profileName')) {
                    console.log('🔍 Profile Name changed by Supabase, restoring from localStorage...');
                    taskProfileNameDisplay.textContent = localStorage.getItem('profileName') || taskProfileNameDisplay.textContent;
                }
                if (mutation.target === taskProfileEmailDisplay && taskProfileEmailDisplay.textContent !== localStorage.getItem('profileBio')) {
                    console.log('🔍 Profile Bio changed by Supabase, restoring from localStorage...');
                    taskProfileEmailDisplay.textContent = localStorage.getItem('profileBio') || taskProfileEmailDisplay.textContent;
                }
                if (mutation.target === taskProfileAvatar && taskProfileAvatar.src !== localStorage.getItem('profileAvatar')) {
                    console.log('🔍 Profile Avatar changed by Supabase, restoring from localStorage...');
                    taskProfileAvatar.src = localStorage.getItem('profileAvatar') || taskProfileAvatar.src;
                }
            });
        });

        taskObserver.observe(taskProfileNameDisplay, { attributes: true, childList: true, subtree: true });
        taskObserver.observe(taskProfileEmailDisplay, { attributes: true, childList: true, subtree: true });
        taskObserver.observe(taskProfileAvatar, { attributes: true, childList: true, subtree: true });

        // ==================== PERIODIC RESTORATION: Every 1000ms ====================
        setInterval(function() {
            const currentName = taskProfileNameDisplay ? taskProfileNameDisplay.textContent : '';
            const savedName = localStorage.getItem('profileName');
            if (currentName !== savedName && savedName) {
                console.log('🔄 Periodic: Restoring profile name from localStorage');
                if (taskProfileNameDisplay) taskProfileNameDisplay.textContent = savedName;
            }

            const currentBio = taskProfileEmailDisplay ? taskProfileEmailDisplay.textContent : '';
            const savedBio = localStorage.getItem('profileBio');
            if (currentBio !== savedBio && savedBio) {
                console.log('🔄 Periodic: Restoring profile bio from localStorage');
                if (taskProfileEmailDisplay) taskProfileEmailDisplay.textContent = savedBio;
            }

            const currentAvatar = taskProfileAvatar ? taskProfileAvatar.src : '';
            const savedAvatar = localStorage.getItem('profileAvatar');
            if (currentAvatar !== savedAvatar && savedAvatar) {
                console.log('🔄 Periodic: Restoring profile avatar from localStorage');
                if (taskProfileAvatar) taskProfileAvatar.src = savedAvatar;
            }
        }, 1000);

        // ==================== OVERRIDE: SUPABASE populateUserProfile ====================
        const taskCheckForApp = setInterval(function() {
            if (window.app && window.app.populateUserProfile) {
                clearInterval(taskCheckForApp);
                const originalPopulate = window.app.populateUserProfile.bind(window.app);
                window.app.populateUserProfile = function() {
                    console.log('🔴 populateUserProfile called by Supabase');
                    originalPopulate();
                    setTimeout(function() {
                        loadProfileFromStorage();
                        console.log('🟢 Profile restored from localStorage after Supabase call');
                    }, 500);
                };
            }
        }, 100);

        // ==================== STORAGE EVENT LISTENER: Cross-tab Synchronization ====================
        window.addEventListener('storage', function(e) {
            if (e.key === 'profileName' || e.key === 'profileBio' || e.key === 'profileAvatar') {
                console.log('💾 Storage changed in another tab, reloading profile...');
                loadProfileFromStorage();
            }
        });

        // ==================== LOGOUT BUTTON ====================
        const taskLogoutBtn = document.querySelector('.logout-btn');
        if (taskLogoutBtn) {
            taskLogoutBtn.addEventListener('click', async () => {
                try {
                    // Clear all local storage
                    localStorage.clear();
                    sessionStorage.clear();

                    // Sign out from Supabase globally
                    const supabaseClient = await getSupabaseClient();
                    const { error } = await supabaseClient.auth.signOut({ scope: 'global' });
                    if (error) {
                        console.error('Supabase signOut error:', error);
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    // Force redirect to index after clearing everything
                    window.location.href = 'index.html';
                }
            });
        }

        // ==================== LEFT SIDEBAR TOGGLE ====================
        const taskToggleBtn = document.getElementById('interactiveTasksToggleSidebar');
        const taskSidebar = document.getElementById('leftSidebar');

        console.log('taskToggleBtn:', taskToggleBtn);
        console.log('taskSidebar:', taskSidebar);

        if (taskToggleBtn && taskSidebar) {
            taskToggleBtn.addEventListener('click', function() {
                console.log('Button clicked!');
                console.log('Before toggle:', taskSidebar.className);
                taskSidebar.classList.toggle('mobile-open');
                console.log('After toggle:', taskSidebar.className);
                console.log('Computed display:', window.getComputedStyle(taskSidebar).display);
            });
        }

        // ==================== POPULATE USER PROFILE ====================
        async function populateUserProfile() {
            try {
                console.log('🔍 populateUserProfile called');

                // First try to load from localStorage
                const savedName = localStorage.getItem('profileName');
                const savedBio = localStorage.getItem('profileBio');
                const savedAvatar = localStorage.getItem('profileAvatar');

                if (savedName || savedBio || savedAvatar) {
                    console.log('📦 Loading profile from localStorage');
                    if (savedName && document.querySelector('.profile-name')) {
                        document.querySelector('.profile-name').textContent = savedName;
                    }
                    if (savedBio && document.querySelector('.profile-email')) {
                        document.querySelector('.profile-email').textContent = savedBio;
                    }
                    if (savedAvatar && document.querySelector('.profile-avatar')) {
                        document.querySelector('.profile-avatar').src = savedAvatar;
                    }
                    return;
                }

                // If no localStorage data, load from Supabase
                console.log('🔄 No localStorage data, loading from Supabase');
                const supabaseClient = await getSupabaseClient();
                const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

                if (userError || !user) {
                    console.log('No authenticated user');
                    return;
                }

                // Fetch user profile from database
                const { data: profile, error: profileError } = await supabaseClient
                    .from('user_profiles')
                    .select('full_name, bio, avatar_url')
                    .eq('id', user.id)
                    .single();

                if (profileError && profileError.code !== 'PGRST116') {
                    console.error('Error fetching profile:', profileError);
                    return;
                }

                // Update UI with database data
                if (profile) {
                    console.log('📊 Loading profile from database');
                    if (profile.full_name && document.querySelector('.profile-name')) {
                        document.querySelector('.profile-name').textContent = profile.full_name;
                        localStorage.setItem('profileName', profile.full_name);
                    }
                    if (profile.bio && document.querySelector('.profile-email')) {
                        document.querySelector('.profile-email').textContent = profile.bio;
                        localStorage.setItem('profileBio', profile.bio);
                    }
                    if (profile.avatar_url && document.querySelector('.profile-avatar')) {
                        document.querySelector('.profile-avatar').src = profile.avatar_url;
                        localStorage.setItem('profileAvatar', profile.avatar_url);
                    }
                } else {
                    // No profile in database, use default values
                    console.log('📝 No profile in database, using defaults');
                    const defaultName = user.email ? user.email.split('@')[0] : 'Student';
                    if (document.querySelector('.profile-name')) {
                        document.querySelector('.profile-name').textContent = defaultName;
                        localStorage.setItem('profileName', defaultName);
                    }
                    if (document.querySelector('.profile-email')) {
                        document.querySelector('.profile-email').textContent = user.email || '';
                        localStorage.setItem('profileBio', user.email || '');
                    }
                }

            } catch (error) {
                console.error('Error in populateUserProfile:', error);
            }
        }

        // ==================== COURSE INTERFACE ====================
        // Initialize CourseInterface for shared functionality
        if (window.CourseInterface) {
            window.app = new window.CourseInterface();
        }

        // Check authentication on page load
        checkAuth();